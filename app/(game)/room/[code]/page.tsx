"use client"

import { useState, useEffect, useRef, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Crown, Copy, Check, Play, Users, Clock,
  CheckCircle2, XCircle, Activity, User, Lightbulb
} from "lucide-react"
import type { Room, Player, RoomScore, SSEEvent } from "@/lib/types"
import type { Case } from "@/lib/types"

type SafeCase = Omit<Case, "correct_answer" | "accepted_synonyms" | "explanation" | "distractors">

type RoomPhase = "lobby" | "playing" | "question_ended" | "ended"

interface QuestionEndedPayload {
  index: number
  correct_answer: number
  explanation: string
  scores: RoomScore[]
}

interface CompetitiveSubmitResponse {
  isCorrect: boolean
  scoreAwarded: number
  nextCase: SafeCase | null
}

interface RoomAnswerKeyItem {
  index: number
  question: string
  correctOption: string
  explanation: string
}

function Avatar({ color, name, size = "md" }: { color: string; name: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
  return (
    <div className={`${s} rounded-full flex items-center justify-center font-bold text-white shrink-0`} style={{ backgroundColor: color }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const joinCode = code.toUpperCase()
  const router = useRouter()

  const [phase, setPhase] = useState<RoomPhase>("lobby")
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [myGuestId, setMyGuestId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [startLoading, setStartLoading] = useState(false)

  // Game state
  const [currentCase, setCurrentCase] = useState<SafeCase | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [timerEnd, setTimerEnd] = useState<number | null>(null)
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [questionStart, setQuestionStart] = useState(Date.now())
  const [qEndedPayload, setQEndedPayload] = useState<QuestionEndedPayload | null>(null)
  const [scores, setScores] = useState<RoomScore[]>([])
  const [finalRankings, setFinalRankings] = useState<RoomScore[]>([])
  const [competitiveDone, setCompetitiveDone] = useState(false)
  const [answerKey, setAnswerKey] = useState<RoomAnswerKeyItem[]>([])
  const [answerKeyLoading, setAnswerKeyLoading] = useState(false)

  const eventSourceRef = useRef<EventSource | null>(null)

  // Load identity
  useEffect(() => {
    const raw = localStorage.getItem("rxarena_identity")
    if (raw) {
      const id = JSON.parse(raw)
      setMyGuestId(id.guestId)
    }
  }, [])

  // Fetch initial room state and join
  useEffect(() => {
    async function init() {
      // Join the room
      const joinRes = await fetch(`/api/room/${joinCode}/join`, { method: "POST" })
      if (!joinRes.ok) {
        const data = await joinRes.json()
        if (data.error === "already_started") {
          // They may be rejoining — fetch state and connect to SSE
        } else {
          router.push("/room/join")
          return
        }
      }

      // Fetch room state
      const stateRes = await fetch(`/api/room/${joinCode}`)
      if (!stateRes.ok) { router.push("/room/join"); return }
      const { room: r, players: p } = await stateRes.json()
      setRoom(r)
      setPlayers(p)
      if (r.status === "in_progress") setPhase("playing")
      if (r.status === "completed") { router.push(`/room/${joinCode}/results`); return }
    }
    init()
  }, [joinCode, router])

  // SSE connection
  useEffect(() => {
    const es = new EventSource(`/api/room/${joinCode}/events`)
    eventSourceRef.current = es

    es.onmessage = (ev) => {
      const event = JSON.parse(ev.data) as SSEEvent
      handleSSEEvent(event)
    }
    es.onerror = () => {
      // SSE reconnects automatically
    }
    return () => { es.close() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode])

  useEffect(() => {
    if (phase !== "ended") return

    let cancelled = false
    async function fetchAnswerKey() {
      setAnswerKeyLoading(true)
      try {
        const res = await fetch(`/api/room/${joinCode}/answers`)
        if (!res.ok) {
          if (!cancelled) setAnswerKey([])
          return
        }
        const data = (await res.json()) as { answerKey: RoomAnswerKeyItem[] }
        if (!cancelled) {
          setAnswerKey(data.answerKey ?? [])
        }
      } finally {
        if (!cancelled) setAnswerKeyLoading(false)
      }
    }

    fetchAnswerKey()
    return () => {
      cancelled = true
    }
  }, [phase, joinCode])

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "player_joined":
        setPlayers((prev) => {
          if (prev.find((p) => p.guest_id === event.payload.guest_id)) return prev
          return [...prev, {
            guest_id: event.payload.guest_id,
            display_name: event.payload.display_name,
            avatar_color: event.payload.avatar_color,
            joined_at: Date.now(),
            is_connected: true,
          }]
        })
        break
      case "player_left":
        setPlayers((prev) => prev.filter((p) => p.guest_id !== event.payload.guest_id))
        break
      case "game_started":
        setPhase("playing")
        setTotalQuestions(event.payload.total_questions)
        break
      case "question_started":
        setCurrentCase(event.payload.case_data)
        setQuestionIndex(event.payload.index)
        setTimerEnd(event.payload.timer_end)
        setSelected(null)
        setSubmitted(false)
        setQEndedPayload(null)
        setQuestionStart(Date.now())
        setPhase("playing")
        break
      case "question_ended":
        setQEndedPayload(event.payload)
        setScores(event.payload.scores)
        setPhase("question_ended")
        break
      case "scoreboard_updated":
        setScores(event.payload.rankings)
        break
      case "match_ended":
        setFinalRankings(event.payload.final_rankings)
        setPhase("ended")
        break
      case "room_cancelled":
        router.push("/dashboard")
        break
    }
  }, [router])

  // Timer countdown
  useEffect(() => {
    if (!timerEnd || (phase !== "playing" && phase !== "question_ended" && !competitiveDone)) return
    const interval = setInterval(() => {
      setTimeRemainingMs(timerEnd - Date.now())
    }, 200)
    return () => clearInterval(interval)
  }, [timerEnd, phase])

  async function handleSubmit() {
    if (selected === null || submitted || submitting || !currentCase) return
    setSubmitting(true)
    const responseTimeMs = Date.now() - questionStart
    try {
      const res = await fetch(`/api/room/${joinCode}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex, answer: selected, responseTimeMs }),
      })
      if (!res.ok) return
      setSubmitted(true)

      if (room?.mode === "competitive") {
        const data = (await res.json()) as CompetitiveSubmitResponse

        setTimeout(() => {
          if (data.nextCase) {
            setCurrentCase(data.nextCase)
            setQuestionIndex((i) => i + 1)
            setSelected(null)
            setSubmitted(false)
            setQEndedPayload(null)
            setQuestionStart(Date.now())
            setPhase("playing")
          } else {
            setCompetitiveDone(true)
          }
        }, 600)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStart() {
    setStartLoading(true)
    await fetch(`/api/room/${joinCode}/start`, { method: "POST" })
    setStartLoading(false)
  }

  async function handleCancel() {
    await fetch(`/api/room/${joinCode}/cancel`, { method: "POST" })
    router.push("/dashboard")
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHost = room?.host_guest_id === myGuestId
  const canRevealAnswers = !isHost && room?.mode !== "competitive"

  // -------------------- LOBBY --------------------
  if (phase === "lobby") {
    return (
      <div className="p-4 md:p-8 max-w-lg mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Game Lobby</h1>
          {room && (
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {room.mode} · {room.difficulty} · {room.specialty === "mixed" ? "Mixed" : room.specialty} · {room.question_count}Q
            </p>
          )}
        </header>

        {/* Join code */}
        <Card className="p-6 border-0 shadow-sm mb-4">
          <div className="flex flex-col items-center text-center">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Room Code</p>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-4xl font-black tracking-[0.3em] text-foreground">{joinCode}</span>
              <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Share this code for others to join</p>
          </div>
        </Card>

        {/* Players */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Players
            </h3>
            <span className="text-sm text-muted-foreground">{players.length}/50</span>
          </div>
          <Card className="border-0 shadow-sm divide-y divide-border">
            {players.map((p) => (
              <div key={p.guest_id} className="p-3 flex items-center gap-3">
                <Avatar color={p.avatar_color} name={p.display_name} />
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{p.display_name}</p>
                  {p.guest_id === room?.host_guest_id && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-500" /> Host
                    </span>
                  )}
                </div>
                {p.guest_id === myGuestId && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">You</span>
                )}
              </div>
            ))}
          </Card>
        </div>

        {/* Host controls */}
        {isHost && (
          <div className="space-y-3">
            <Button onClick={handleStart} disabled={startLoading || players.length < 1} className="w-full h-12" size="lg">
              <Play className="w-5 h-5 mr-2 fill-current" />
              {startLoading ? "Starting…" : `Start Game (${players.length} player${players.length !== 1 ? "s" : ""})`}
            </Button>
            <Button variant="outline" onClick={handleCancel} className="w-full h-10">
              Cancel Room
            </Button>
          </div>
        )}

        {!isHost && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Waiting for the host to start the game…</p>
          </div>
        )}
      </div>
    )
  }

  // -------------------- ENDED --------------------
  if (phase === "ended") {
    const myRank = finalRankings.find((r) => r.guest_id === myGuestId)
    return (
      <div className="p-4 md:p-8 max-w-lg mx-auto h-[calc(100vh-5rem)] md:h-[calc(100vh-2rem)] flex flex-col">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Match Over!</h1>
          {myRank && (
            <p className="text-muted-foreground text-sm mt-1">
              You finished #{myRank.rank} with {myRank.score.toLocaleString()} pts
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 grid-rows-[1.35fr_1fr] gap-4 flex-1 min-h-0 mb-6">
          <Card className="p-3 border-0 shadow-sm flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-foreground mb-3">Leaderboard</h2>
            <div className="space-y-2 overflow-y-auto min-h-0 pr-1">
              {finalRankings.map((r) => (
                <Card key={r.guest_id} className={`p-3 border-0 shadow-sm ${r.guest_id === myGuestId ? "border-2 border-primary" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center font-bold text-muted-foreground">#{r.rank}</span>
                    <Avatar color={r.avatar_color} name={r.display_name} size="sm" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{r.display_name}</p>
                      <p className="text-xs text-muted-foreground">{r.correct_count} correct</p>
                    </div>
                    <span className="font-bold text-foreground">{r.score.toLocaleString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-3 border-0 shadow-sm flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-foreground mb-3">Correct Answers</h2>
            <div className="space-y-2 overflow-y-auto min-h-0 pr-1">
              {answerKeyLoading && (
                <p className="text-sm text-muted-foreground">Loading answers…</p>
              )}
              {!answerKeyLoading && answerKey.length === 0 && (
                <p className="text-sm text-muted-foreground">No answer key available.</p>
              )}
              {answerKey.map((item) => (
                <Card key={item.index} className="p-3 border-0 shadow-sm">
                  <p className="text-xs text-muted-foreground mb-1">Q{item.index}</p>
                  <p className="text-sm font-medium text-foreground mb-2">{item.question}</p>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">Answer:</span> {item.correctOption}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{item.explanation}</p>
                </Card>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-3 shrink-0">
          <Button onClick={() => router.push("/room/create")} className="w-full h-12">Play Again</Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full h-12">Home</Button>
        </div>
      </div>
    )
  }

  // -------------------- COMPETITIVE DONE (waiting for timer / others) --------------------
  if (competitiveDone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">All done!</h2>
          <p className="text-muted-foreground text-sm mb-4">Waiting for the timer to end or other players to finish…</p>
          {timerEnd && timeRemainingMs !== null && (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-muted rounded-full">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono font-medium">{formatTime(timeRemainingMs)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // -------------------- PLAYING / QUESTION_ENDED --------------------
  if (!currentCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Waiting for first question…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <span className="text-sm font-medium text-muted-foreground">
            Q{questionIndex + 1}/{totalQuestions}
          </span>

          {timerEnd && timeRemainingMs !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
              timeRemainingMs <= 10_000 ? "bg-destructive/10 text-destructive" : "bg-muted"
            }`}>
              <Clock className="w-4 h-4" />
              <span className="text-sm font-mono font-medium">{formatTime(timeRemainingMs)}</span>
            </div>
          )}

          <span className="text-xs text-muted-foreground">
            {players.length} players
          </span>
        </div>
        <div className="max-w-4xl mx-auto mt-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${((questionIndex + (phase === "question_ended" ? 1 : 0)) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Patient Card */}
        <Card className="p-4 mb-4 border-0 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {currentCase.patient_persona.age}yo {currentCase.patient_persona.sex}
              </h3>
              <p className="text-sm text-muted-foreground">{currentCase.patient_persona.chief_complaint}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            <span className="font-medium">History:</span> {currentCase.patient_persona.history}
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {(currentCase.physicalExamination?.vitals ?? []).map((vital) => {
              const [label, value] = Object.entries(vital)[0]
              return (
                <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg">
                  <Activity className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium">{label}: {value}</span>
                </div>
              )
            })}
          </div>

          <div className="space-y-1 mb-3">
            {(currentCase.physicalExamination?.findings ?? []).map((finding) => {
              const [label, value] = Object.entries(finding)[0]
              return (
                <p key={label} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{label}:</span> {value}
                </p>
              )
            })}
          </div>

          {currentCase.labs && currentCase.labs.length > 0 && (
            <div className="mt-3 space-y-1">
              {currentCase.labs.map((lab) => (
                <p key={lab} className="text-xs font-mono bg-muted/50 px-2 py-1 rounded">{lab}</p>
              ))}
            </div>
          )}
        </Card>

        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{currentCase.question_text}</h2>
        </div>

        {/* Submitted banner — only shown on the last question */}
        {submitted && phase === "playing" && questionIndex + 1 === totalQuestions && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 text-center">
            <p className="text-sm font-medium text-primary">Answer submitted — waiting for others…</p>
          </div>
        )}

        {/* Answers */}
        <div className="space-y-3 mb-6">
          {currentCase.options.map((option, index) => {
            const isSelected = selected === index
            const isCorrect = canRevealAnswers && qEndedPayload?.correct_answer === index
            const isWrong = canRevealAnswers && phase === "question_ended" && isSelected && !isCorrect

            let cardClass = "border-0 shadow-sm transition-all"
            if (phase === "question_ended" && canRevealAnswers) {
              if (isCorrect) cardClass += " bg-emerald-500/10 border-2 border-emerald-500"
              else if (isWrong) cardClass += " bg-destructive/10 border-2 border-destructive"
            } else if (isSelected) {
              cardClass += " border-2 border-primary bg-primary/5"
            } else if (!submitted) {
              cardClass += " cursor-pointer hover:shadow-md"
            }

            return (
              <Card
                key={index}
                className={`p-4 ${cardClass}`}
                onClick={() => !submitted && phase === "playing" && setSelected(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium ${
                    phase === "question_ended" && canRevealAnswers && isCorrect ? "bg-emerald-500 text-white"
                    : phase === "question_ended" && canRevealAnswers && isWrong ? "bg-destructive text-destructive-foreground"
                    : isSelected ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {phase === "question_ended" && canRevealAnswers && isCorrect ? <CheckCircle2 className="w-4 h-4" />
                    : phase === "question_ended" && canRevealAnswers && isWrong ? <XCircle className="w-4 h-4" />
                    : String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-sm font-medium text-foreground">{option}</span>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Question ended explanation */}
        {phase === "question_ended" && qEndedPayload && canRevealAnswers && (
          <Card className="p-4 mb-6 border-0 shadow-sm bg-blue-500/5">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-1">Explanation</p>
                <p className="text-sm text-muted-foreground">{qEndedPayload.explanation}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Scoreboard (if visible) */}
        {room?.scoreboard_visible && scores.length > 0 && (
          <Card className="p-4 border-0 shadow-sm">
            <h3 className="font-semibold text-foreground text-sm mb-3">Live Scores</h3>
            <div className="space-y-2">
              {scores.slice(0, 5).map((s) => (
                <div key={s.guest_id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">#{s.rank}</span>
                  <Avatar color={s.avatar_color} name={s.display_name} size="sm" />
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{s.display_name}</span>
                  <span className="text-sm font-bold text-foreground">{s.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Submit button */}
        {phase === "playing" && !submitted && (
          <div className="mt-4">
            <Button
              onClick={handleSubmit}
              disabled={selected === null || submitting}
              className="w-full h-12"
              size="lg"
            >
              {submitting ? "Submitting…" : "Submit Answer"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
