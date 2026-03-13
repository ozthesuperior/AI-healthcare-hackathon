"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Target, Clock, RotateCcw, Home, CheckCircle2, XCircle, ChevronDown, ChevronUp, TrendingUp } from "lucide-react"

interface AnswerReview {
  caseId: string
  question: string
  options: string[]
  submittedAnswer: number
  correctAnswer: number | null
  isCorrect: boolean
  scoreAwarded: number
  responseTimeMs: number
  explanation: string | null
}

interface ResultData {
  sessionId: string
  mode: string
  score: number
  totalCorrect: number
  totalQuestions: number
  review: AnswerReview[]
  submittedToLeaderboard: boolean
}

export default function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const router = useRouter()
  const [data, setData] = useState<ResultData | null>(null)
  const [expandedReview, setExpandedReview] = useState<number | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(`rxarena_result_${sessionId}`)
    if (!raw) { router.push("/play"); return }
    const result = JSON.parse(raw) as ResultData
    setData(result)

    // Save to localStorage stats
    const statsRaw = localStorage.getItem("rxarena_stats")
    const stats = statsRaw ? JSON.parse(statsRaw) : { sessions: [], accuracyBySpecialty: {} }
    stats.sessions = [
      { sessionId, mode: result.mode, score: result.score, accuracy: Math.round((result.totalCorrect / result.totalQuestions) * 100), completedAt: Date.now() },
      ...stats.sessions.slice(0, 19),
    ]
    localStorage.setItem("rxarena_stats", JSON.stringify(stats))
  }, [sessionId, router])

  if (!data) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading results…</p></div>

  const accuracy = Math.round((data.totalCorrect / data.totalQuestions) * 100)
  const avgTimeMs = data.review.length > 0
    ? Math.round(data.review.reduce((s, a) => s + a.responseTimeMs, 0) / data.review.length)
    : 0
  const revealAnswers = data.mode !== "competitive"

  const perfMsg = accuracy >= 80 ? { text: "Excellent!", sub: "Outstanding clinical reasoning." }
    : accuracy >= 60 ? { text: "Good Job!", sub: "Keep sharpening your skills." }
    : accuracy >= 40 ? { text: "Not Bad", sub: "Room to improve — keep going." }
    : { text: "Keep Learning", sub: "Review the explanations and try again." }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-md mx-auto pt-4">
        {/* Hero */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">{perfMsg.text}</h1>
          <p className="text-muted-foreground text-sm">{perfMsg.sub}</p>
        </div>

        {/* Score card */}
        <Card className="p-6 mb-4 border-0 shadow-lg bg-primary text-primary-foreground">
          <div className="text-center">
            <p className="text-sm opacity-75 mb-1">Total Score</p>
            <p className="text-5xl font-black mb-2">{data.score.toLocaleString()}</p>
            <p className="text-sm opacity-75 capitalize">{data.mode}</p>
            {data.submittedToLeaderboard && (
              <p className="text-xs opacity-60 mt-2">Score submitted to weekly leaderboard</p>
            )}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-3 border-0 shadow-sm text-center">
            <Target className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </Card>
          <Card className="p-3 border-0 shadow-sm text-center">
            <Trophy className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{data.totalCorrect}/{data.totalQuestions}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </Card>
          <Card className="p-3 border-0 shadow-sm text-center">
            <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{(avgTimeMs / 1000).toFixed(1)}s</p>
            <p className="text-xs text-muted-foreground">Avg Time</p>
          </Card>
        </div>

        {/* Answer summary dots */}
        <Card className="p-4 mb-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Question Summary</h3>
          </div>
          <div className="flex gap-2">
            {data.review.map((a, i) => (
              <div
                key={i}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center ${
                  a.isCorrect ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                }`}
              >
                {a.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </div>
            ))}
          </div>
        </Card>

        {/* Review — always shown now that session is complete */}
        <div className="mb-6 space-y-2">
          <h3 className="font-semibold text-foreground text-sm">Answer Review</h3>
          {data.review.map((a, i) => (
            <Card key={i} className="border-0 shadow-sm overflow-hidden">
              <button
                className="w-full p-4 text-left flex items-start gap-3"
                onClick={() => setExpandedReview(expandedReview === i ? null : i)}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  a.isCorrect ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                }`}>
                  {a.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">{a.question}</p>
                  <p className={`text-xs mt-0.5 ${a.isCorrect ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {a.isCorrect ? `+${a.scoreAwarded} pts` : `Incorrect · You chose: ${a.options[a.submittedAnswer] ?? "Timeout"}`}
                  </p>
                </div>
                {expandedReview === i ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {expandedReview === i && (
                <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2">
                  <div className="space-y-1">
                    {a.options.map((opt, oi) => (
                      <div key={oi} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                        revealAnswers && oi === a.correctAnswer ? "bg-emerald-500/10 text-emerald-700" :
                        oi === a.submittedAnswer && !a.isCorrect ? "bg-destructive/10 text-destructive" : ""
                      }`}>
                        <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                        <span>{opt}</span>
                        {revealAnswers && oi === a.correctAnswer && <CheckCircle2 className="w-3 h-3 ml-auto shrink-0" />}
                      </div>
                    ))}
                  </div>
                  {revealAnswers && a.explanation && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium text-foreground mb-1">Explanation</p>
                      <p className="text-xs text-muted-foreground">{a.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={() => router.push("/play")} className="w-full h-12" size="lg">
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="h-12">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button variant="outline" onClick={() => router.push("/leaderboard")} className="h-12">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
