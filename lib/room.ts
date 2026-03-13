import { redis } from "@/lib/redis"
import { getCases, getCaseById } from "@/lib/cases"
import { calcScore, rankScores } from "@/lib/scoring"
import { publish } from "@/lib/sse"
import type {
  Case,
  Room,
  Player,
  AnswerRecord,
  RoomScore,
  RoomResult,
  Specialty,
  GameMode,
} from "@/lib/types"

const ROOM_TTL = 24 * 60 * 60 // 24 hours in seconds
const MAX_PLAYERS = 50
const BLITZ_PER_QUESTION_SECONDS = 30
const COMPETITIVE_GAME_SECONDS = 5 * 60 // 5-minute total game timer

// ------------------------------------------------------------------
// Code generation
// ------------------------------------------------------------------
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function generateCode(): string {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("")
}

// ------------------------------------------------------------------
// Redis key helpers
// ------------------------------------------------------------------
function rk(roomId: string) {
  return {
    room: `room:${roomId}`,
    players: `room:${roomId}:players`,
    cases: `room:${roomId}:cases`,
    state: `room:${roomId}:state`,
    answers: (qIdx: number) => `room:${roomId}:answers:${qIdx}`,
    scores: `room:${roomId}:scores`,
    result: `room:${roomId}:result`,
  }
}

async function setTTL(roomId: string, ttl = ROOM_TTL) {
  const keys = rk(roomId)
  const pipeline = redis.pipeline()
  pipeline.expire(keys.room, ttl)
  pipeline.expire(keys.players, ttl)
  pipeline.expire(keys.cases, ttl)
  pipeline.expire(keys.state, ttl)
  pipeline.expire(keys.scores, ttl)
  pipeline.expire(keys.result, ttl)
  await pipeline.exec()
}

// ------------------------------------------------------------------
// Create room
// ------------------------------------------------------------------
export async function createRoom(opts: {
  hostGuestId: string
  hostDisplayName: string
  hostAvatarColor: string
  mode: Exclude<GameMode, "practice">
  specialty: Specialty | "mixed"
  questionCount: number
  scoreboardVisible: boolean
}): Promise<Room> {
  const { nanoid } = await import("nanoid")
  const roomId = nanoid()
  const joinCode = generateCode()

  const now = Date.now()
  const expiresAt = now + ROOM_TTL * 1000

  const room: Room = {
    id: roomId,
    host_guest_id: opts.hostGuestId,
    join_code: joinCode,
    mode: opts.mode,
    specialty: opts.specialty as Specialty,
    question_count: Math.min(opts.questionCount, 10),
    status: "lobby",
    scoreboard_visible: opts.scoreboardVisible,
    created_at: now,
    expires_at: expiresAt,
  }

  const keys = rk(roomId)
  const pipeline = redis.pipeline()
  pipeline.set(keys.room, JSON.stringify(room), "EX", ROOM_TTL)
  pipeline.set(`room:code:${joinCode}`, roomId, "EX", ROOM_TTL)

  const hostPlayer: Player = {
    guest_id: opts.hostGuestId,
    display_name: opts.hostDisplayName,
    avatar_color: opts.hostAvatarColor,
    joined_at: now,
    is_connected: true,
  }
  pipeline.hset(keys.players, opts.hostGuestId, JSON.stringify(hostPlayer))
  pipeline.expire(keys.players, ROOM_TTL)
  await pipeline.exec()

  return room
}

// ------------------------------------------------------------------
// Get room
// ------------------------------------------------------------------
export async function getRoom(joinCode: string): Promise<Room | null> {
  const roomId = await redis.get(`room:code:${joinCode}`)
  if (!roomId) return null
  const raw = await redis.get(rk(roomId).room)
  if (!raw) return null
  return JSON.parse(raw) as Room
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const raw = await redis.get(rk(roomId).room)
  if (!raw) return null
  return JSON.parse(raw) as Room
}

export async function getRoomPlayers(roomId: string): Promise<Player[]> {
  const hash = await redis.hgetall(rk(roomId).players)
  return Object.values(hash).map((v) => JSON.parse(v) as Player)
}

// ------------------------------------------------------------------
// Join room
// ------------------------------------------------------------------
export type JoinError = "not_found" | "already_started" | "full" | "duplicate_name"

export async function joinRoom(
  joinCode: string,
  player: { guest_id: string; display_name: string; avatar_color: string }
): Promise<{ room: Room; players: Player[] } | { error: JoinError }> {
  const room = await getRoom(joinCode)
  if (!room) return { error: "not_found" }
  if (room.status !== "lobby") return { error: "already_started" }

  const players = await getRoomPlayers(room.id)
  if (players.length >= MAX_PLAYERS) return { error: "full" }

  const duplicate = players.find(
    (p) => p.guest_id !== player.guest_id && p.display_name.toLowerCase() === player.display_name.toLowerCase()
  )
  if (duplicate) return { error: "duplicate_name" }

  const existing = players.find((p) => p.guest_id === player.guest_id)
  const newPlayer: Player = {
    guest_id: player.guest_id,
    display_name: player.display_name,
    avatar_color: player.avatar_color,
    joined_at: existing?.joined_at ?? Date.now(),
    is_connected: true,
  }

  await redis.hset(rk(room.id).players, player.guest_id, JSON.stringify(newPlayer))

  const updatedPlayers = [...players.filter((p) => p.guest_id !== player.guest_id), newPlayer]

  await publish(room.id, {
    type: "player_joined",
    payload: { guest_id: player.guest_id, display_name: player.display_name, avatar_color: player.avatar_color },
  })

  return { room, players: updatedPlayers }
}

// ------------------------------------------------------------------
// Leave room
// ------------------------------------------------------------------
export async function leaveRoom(joinCode: string, guestId: string): Promise<void> {
  const room = await getRoom(joinCode)
  if (!room) return

  await redis.hdel(rk(room.id).players, guestId)

  const remaining = await getRoomPlayers(room.id)

  // Reassign host if needed
  if (room.host_guest_id === guestId && remaining.length > 0) {
    const newHost = remaining.sort((a, b) => a.joined_at - b.joined_at)[0]
    room.host_guest_id = newHost.guest_id
    await redis.set(rk(room.id).room, JSON.stringify(room), "KEEPTTL")
  }

  if (remaining.length === 0) {
    await cancelRoom(room.id)
    return
  }

  await publish(room.id, { type: "player_left", payload: { guest_id: guestId } })
}

// ------------------------------------------------------------------
// Cancel room
// ------------------------------------------------------------------
export async function cancelRoom(roomId: string): Promise<void> {
  const raw = await redis.get(rk(roomId).room)
  if (!raw) return
  const room = JSON.parse(raw) as Room
  room.status = "cancelled"
  await redis.set(rk(roomId).room, JSON.stringify(room), "KEEPTTL")
  await publish(roomId, { type: "room_cancelled", payload: {} })
}

// ------------------------------------------------------------------
// Start game
// ------------------------------------------------------------------
export async function startGame(joinCode: string, hostGuestId: string): Promise<Room | null> {
  const room = await getRoom(joinCode)
  if (!room || room.host_guest_id !== hostGuestId || room.status !== "lobby") return null

  // Select cases
  const cases = getCases({
    specialty: room.specialty === "mixed" ? undefined : room.specialty,
    count: room.question_count,
  })

  const caseIds = cases.map((c) => c.id)
  const actualQuestionCount = caseIds.length
  if (actualQuestionCount === 0) return null

  // Keep room metadata aligned with the actual selected case set.
  room.question_count = actualQuestionCount

  room.status = "in_progress"
  const keys = rk(room.id)

  const pipeline = redis.pipeline()
  pipeline.set(keys.room, JSON.stringify(room), "KEEPTTL")
  for (const id of caseIds) {
    pipeline.rpush(keys.cases, id)
  }
  pipeline.expire(keys.cases, ROOM_TTL)
  await pipeline.exec()

  // Publish game_started
  const firstCase = cases[0]
  const now = Date.now()
  let timerEnd: number | null = null

  if (room.mode === "competitive") {
    // Single 5-minute timer for the whole game; questions advance when all players submit
    timerEnd = now + COMPETITIVE_GAME_SECONDS * 1000
    await redis.hset(keys.state, "current_question", 0, "started_at", now, "timer_end", timerEnd)
    await redis.expire(keys.state, ROOM_TTL)

    await publish(room.id, {
      type: "game_started",
      payload: { total_questions: actualQuestionCount, timer_end: timerEnd },
    })

    const { correct_answer: _ca, accepted_synonyms: _as, explanation: _ex, distractors: _d, ...safeCase } = firstCase

    await publish(room.id, {
      type: "question_started",
      payload: { index: 0, case_data: safeCase, timer_end: timerEnd },
    })

    scheduleCompetitiveEnd(room.id, caseIds, actualQuestionCount, timerEnd)
  } else {
    // Blitz: 30-second per-question timer
    timerEnd = now + BLITZ_PER_QUESTION_SECONDS * 1000
    await redis.hset(keys.state, "current_question", 0, "started_at", now, "timer_end", timerEnd)
    await redis.expire(keys.state, ROOM_TTL)

    await publish(room.id, {
      type: "game_started",
      payload: { total_questions: actualQuestionCount, timer_end: timerEnd },
    })

    const { correct_answer: _ca, accepted_synonyms: _as, explanation: _ex, distractors: _d, ...safeCase } = firstCase

    await publish(room.id, {
      type: "question_started",
      payload: { index: 0, case_data: safeCase, timer_end: timerEnd },
    })

    scheduleBlitzAdvancement(room.id, 0, caseIds, actualQuestionCount)
  }

  return room
}

// ------------------------------------------------------------------
// Submit answer in room
// ------------------------------------------------------------------
type SafeCase = Omit<Case, "correct_answer" | "accepted_synonyms" | "explanation" | "distractors">

export type SubmitRoomAnswerResult =
  | {
      isCorrect: boolean
      scoreAwarded: number
      // Competitive only — drives client-side progression without answer reveal
      nextCase: SafeCase | null
    }
  | {
      isCorrect: boolean
      scoreAwarded: number
    }

export async function submitRoomAnswer(
  joinCode: string,
  guestId: string,
  questionIndex: number,
  submittedAnswer: number,
  responseTimeMs: number
): Promise<SubmitRoomAnswerResult | null> {
  const room = await getRoom(joinCode)
  if (!room || room.status !== "in_progress") return null

  const keys = rk(room.id)
  const answerKey = keys.answers(questionIndex)

  // One answer per player per question
  const existing = await redis.hget(answerKey, guestId)
  if (existing) return null

  const caseIds = await redis.lrange(keys.cases, 0, -1)
  if (questionIndex >= caseIds.length) return null

  const c = getCaseById(caseIds[questionIndex])
  if (!c) return null

  // Blitz: reject answers submitted past the per-question timer
  if (room.mode === "blitz") {
    const timerEnd = Number(await redis.hget(keys.state, "timer_end"))
    if (Date.now() > timerEnd) return null
  }

  const isCorrect = submittedAnswer === c.correct_answer
  const scoreAwarded = calcScore(responseTimeMs, isCorrect)

  const record: AnswerRecord = { answer: submittedAnswer, time_ms: responseTimeMs, score: scoreAwarded, is_correct: isCorrect }
  await redis.hset(answerKey, guestId, JSON.stringify(record))
  await redis.expire(answerKey, ROOM_TTL)

  if (scoreAwarded > 0) {
    await redis.zincrby(keys.scores, scoreAwarded, guestId)
    await redis.expire(keys.scores, ROOM_TTL)
  }

  await publish(room.id, {
    type: "answer_accepted",
    payload: { guest_id: guestId, question_index: questionIndex },
  })

  if (room.mode === "competitive") {
    // Each player progresses independently — return next case directly to the submitting player.
    const nextIndex = questionIndex + 1
    let nextCase: SafeCase | null = null
    if (nextIndex < caseIds.length) {
      const nc = getCaseById(caseIds[nextIndex])
      if (nc) {
        const { correct_answer: _ca, accepted_synonyms: _as, explanation: _ex, distractors: _d, ...safe } = nc
        nextCase = safe
      }
    }

    // If every player has answered every question, end the match early
    const players = await getRoomPlayers(room.id)
    const allDone = await checkAllPlayersDone(room.id, players, caseIds.length)
    if (allDone) {
      const finalScores = await buildCurrentScores(room.id, players, caseIds, caseIds.length)
      await endMatch(room.id, finalScores)
    }

    return { isCorrect, scoreAwarded, nextCase }
  }

  // Blitz: if all players answered this question, advance early
  const players = await getRoomPlayers(room.id)
  const answered = await redis.hlen(answerKey)
  if (answered >= players.length) {
    await advanceBlitzQuestion(room.id, questionIndex, caseIds, caseIds.length)
  }

  return { isCorrect, scoreAwarded }
}

async function checkAllPlayersDone(roomId: string, players: Player[], totalQuestions: number): Promise<boolean> {
  const keys = rk(roomId)
  for (const player of players) {
    for (let qi = 0; qi < totalQuestions; qi++) {
      const answered = await redis.hexists(keys.answers(qi), player.guest_id)
      if (!answered) return false
    }
  }
  return true
}

// ------------------------------------------------------------------
// Blitz advancement logic
// ------------------------------------------------------------------
function scheduleBlitzAdvancement(
  roomId: string,
  questionIndex: number,
  caseIds: string[],
  totalQuestions: number
) {
  setTimeout(async () => {
    const room = await getRoomById(roomId)
    if (!room || room.status !== "in_progress") return

    const currentQ = Number(await redis.hget(rk(roomId).state, "current_question"))
    if (currentQ !== questionIndex) return // already advanced

    await advanceBlitzQuestion(roomId, questionIndex, caseIds, totalQuestions)
  }, BLITZ_PER_QUESTION_SECONDS * 1000 + 500) // +500ms grace
}

async function advanceBlitzQuestion(
  roomId: string,
  questionIndex: number,
  caseIds: string[],
  totalQuestions: number
) {
  const keys = rk(roomId)

  // Prevent double-advancing
  const currentQ = Number(await redis.hget(keys.state, "current_question"))
  if (currentQ !== questionIndex) return

  const c = getCaseById(caseIds[questionIndex])
  const players = await getRoomPlayers(roomId)
  const scores = await buildCurrentScores(roomId, players, caseIds, questionIndex + 1)

  await publish(roomId, {
    type: "question_ended",
    payload: {
      index: questionIndex,
      correct_answer: c?.correct_answer ?? 0,
      explanation: c?.explanation ?? "",
      scores,
    },
  })

  const nextIndex = questionIndex + 1
  if (nextIndex >= totalQuestions) {
    await endMatch(roomId, scores)
    return
  }

  const now = Date.now()
  const timerEnd = now + BLITZ_PER_QUESTION_SECONDS * 1000
  await redis.hset(keys.state, "current_question", nextIndex, "timer_end", timerEnd)

  const nextCase = getCaseById(caseIds[nextIndex])
  if (!nextCase) return

  const { correct_answer: _ca, accepted_synonyms: _as, explanation: _ex, distractors: _d, ...safeCase } = nextCase

  await publish(roomId, {
    type: "question_started",
    payload: { index: nextIndex, case_data: safeCase, timer_end: timerEnd },
  })

  scheduleBlitzAdvancement(roomId, nextIndex, caseIds, totalQuestions)
}

// ------------------------------------------------------------------
// Competitive: end the match when the 5-minute game timer expires
// ------------------------------------------------------------------
function scheduleCompetitiveEnd(
  roomId: string,
  caseIds: string[],
  totalQuestions: number,
  timerEnd: number
) {
  const delay = timerEnd - Date.now()
  setTimeout(async () => {
    const room = await getRoomById(roomId)
    if (!room || room.status !== "in_progress") return

    const players = await getRoomPlayers(roomId)
    const scores = await buildCurrentScores(roomId, players, caseIds, totalQuestions)
    await endMatch(roomId, scores)
  }, delay + 500) // +500ms grace
}

// ------------------------------------------------------------------
// Build scores from Redis
// ------------------------------------------------------------------
async function buildCurrentScores(
  roomId: string,
  players: Player[],
  caseIds: string[],
  upToQuestion: number
): Promise<RoomScore[]> {
  const keys = rk(roomId)
  const rawScores: Omit<RoomScore, "rank">[] = []

  for (const player of players) {
    let totalScore = 0
    let correctCount = 0
    let totalTimeMs = 0

    for (let qi = 0; qi < upToQuestion; qi++) {
      const raw = await redis.hget(keys.answers(qi), player.guest_id)
      if (raw) {
        const rec = JSON.parse(raw) as AnswerRecord
        totalScore += rec.score
        if (rec.is_correct) {
          correctCount++
          totalTimeMs += rec.time_ms
        }
      }
    }

    rawScores.push({
      guest_id: player.guest_id,
      display_name: player.display_name,
      avatar_color: player.avatar_color,
      score: totalScore,
      correct_count: correctCount,
      total_time_ms: totalTimeMs,
    })
  }

  return rankScores(rawScores)
}

// ------------------------------------------------------------------
// End match
// ------------------------------------------------------------------
async function endMatch(roomId: string, finalScores: RoomScore[]) {
  const room = await getRoomById(roomId)
  if (!room) return

  room.status = "completed"
  const now = Date.now()

  const result: RoomResult = {
    room_id: roomId,
    join_code: room.join_code,
    mode: room.mode,
    specialty: room.specialty,
    final_rankings: finalScores,
    completed_at: now,
    expires_at: now + ROOM_TTL * 1000,
  }

  const keys = rk(roomId)
  await redis.set(keys.room, JSON.stringify(room), "KEEPTTL")
  await redis.set(keys.result, JSON.stringify(result), "EX", ROOM_TTL)

  await setTTL(roomId)

  await publish(roomId, {
    type: "match_ended",
    payload: { final_rankings: finalScores, room_expires_at: result.expires_at },
  })
}

export async function getRoomResult(joinCode: string): Promise<RoomResult | null> {
  const roomId = await redis.get(`room:code:${joinCode}`)
  if (!roomId) return null
  const raw = await redis.get(rk(roomId).result)
  if (!raw) return null
  return JSON.parse(raw) as RoomResult
}

export async function getRoomCaseIds(roomId: string): Promise<string[]> {
  return redis.lrange(rk(roomId).cases, 0, -1)
}

export async function getCurrentQuestionIndex(roomId: string): Promise<number> {
  const val = await redis.hget(rk(roomId).state, "current_question")
  return val ? Number(val) : 0
}
