import { v4 as uuidv4 } from "uuid"
import { redis } from "@/lib/redis"
import { getCases, getCaseById } from "@/lib/cases"
import { calcScore } from "@/lib/scoring"
import type { GameMode, SoloSession, SessionAnswer, Specialty } from "@/lib/types"

const SESSION_TTL_SECONDS = 60 * 60 // 1 hour

export async function createSession(opts: {
  guestId: string
  displayName: string
  mode: GameMode
  specialty: Specialty | "mixed"
}): Promise<SoloSession> {
  const id = uuidv4()
  const cases = getCases({
    specialty: opts.specialty === "mixed" ? undefined : opts.specialty,
    count: opts.mode === "practice" ? 10 : 5,
  })

  const timeLimitMs =
    opts.mode === "competitive" ? 5 * 60 * 1000 : null

  const session: SoloSession = {
    id,
    guest_id: opts.guestId,
    display_name: opts.displayName,
    mode: opts.mode,
    specialty: opts.specialty as Specialty,
    case_ids: cases.map((c) => c.id),
    current_index: 0,
    score: 0,
    answers: [],
    started_at: Date.now(),
    time_limit_ms: timeLimitMs,
  }

  await redis.set(`session:${id}`, JSON.stringify(session), "EX", SESSION_TTL_SECONDS)
  return session
}

export async function getSession(id: string): Promise<SoloSession | null> {
  const raw = await redis.get(`session:${id}`)
  if (!raw) return null
  return JSON.parse(raw) as SoloSession
}

export async function submitAnswer(
  sessionId: string,
  caseId: string,
  submittedAnswer: number,
  responseTimeMs: number
): Promise<{
  isCorrect: boolean
  scoreAwarded: number
  correctAnswer: number
  explanation: string
} | null> {
  const session = await getSession(sessionId)
  if (!session) return null

  // Prevent duplicate answers for the same case
  if (session.answers.some((a) => a.case_id === caseId)) return null

  const c = getCaseById(caseId)
  if (!c) return null

  const isCorrect = submittedAnswer === c.correct_answer
  const scoreAwarded = calcScore(responseTimeMs, isCorrect)

  const answer: SessionAnswer = {
    case_id: caseId,
    submitted_answer: submittedAnswer,
    is_correct: isCorrect,
    response_time_ms: responseTimeMs,
    score_awarded: scoreAwarded,
  }

  session.answers.push(answer)
  session.score += scoreAwarded
  session.current_index = session.answers.length

  await redis.set(`session:${sessionId}`, JSON.stringify(session), "EX", SESSION_TTL_SECONDS)

  return {
    isCorrect,
    scoreAwarded,
    correctAnswer: c.correct_answer,
    explanation: c.explanation,
  }
}

export async function completeSession(sessionId: string): Promise<SoloSession | null> {
  const session = await getSession(sessionId)
  if (!session) return null
  // Mark as done by reducing TTL (keep for 10 min for results page)
  await redis.expire(`session:${sessionId}`, 600)
  return session
}
