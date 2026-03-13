"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, TrendingUp, Trophy, Clock, RotateCcw } from "lucide-react"

interface Identity {
  guestId: string
  displayName: string
  avatarColor: string
}

interface SessionRecord {
  sessionId: string
  mode: string
  score: number
  accuracy: number
  completedAt: number
}

interface Stats {
  sessions: SessionRecord[]
  accuracyBySpecialty: Record<string, { correct: number; total: number }>
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return "just now"
}

export default function ProfilePage() {
  const router = useRouter()
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [stats, setStats] = useState<Stats>({ sessions: [], accuracyBySpecialty: {} })

  useEffect(() => {
    const idRaw = localStorage.getItem("rxarena_identity")
    if (idRaw) setIdentity(JSON.parse(idRaw))
    const statsRaw = localStorage.getItem("rxarena_stats")
    if (statsRaw) setStats(JSON.parse(statsRaw))
  }, [])

  function handleReset() {
    if (!confirm("Clear all local stats? This cannot be undone.")) return
    localStorage.removeItem("rxarena_stats")
    setStats({ sessions: [], accuracyBySpecialty: {} })
  }

  const sessions = stats.sessions
  const totalSessions = sessions.length
  const avgAccuracy = totalSessions > 0
    ? Math.round(sessions.reduce((s, sess) => s + sess.accuracy, 0) / totalSessions)
    : 0
  const bestScore = totalSessions > 0 ? Math.max(...sessions.map((s) => s.score)) : 0
  const avgTime = 0 // placeholder — response times not stored in stats summary

  const byMode = {
    practice: sessions.filter((s) => s.mode === "practice").length,
    competitive: sessions.filter((s) => s.mode === "competitive").length,
    blitz: sessions.filter((s) => s.mode === "blitz").length,
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Your local performance history</p>
      </header>

      {/* Identity card */}
      <Card className="p-5 border-0 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-xl"
            style={{ backgroundColor: identity?.avatarColor ?? "#6366f1" }}
          >
            {identity?.displayName?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{identity?.displayName ?? "Guest"}</h2>
            <p className="text-sm text-muted-foreground">Guest player · browser-only identity</p>
          </div>
        </div>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 border-0 shadow-sm">
          <Target className="w-4 h-4 text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
          <p className="text-xs text-muted-foreground">Total sessions</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{avgAccuracy}%</p>
          <p className="text-xs text-muted-foreground">Avg accuracy</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <Trophy className="w-4 h-4 text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{bestScore.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Best score</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <Clock className="w-4 h-4 text-blue-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{avgTime > 0 ? `${avgTime}s` : "—"}</p>
          <p className="text-xs text-muted-foreground">Avg response</p>
        </Card>
      </div>

      {/* Sessions by mode */}
      {totalSessions > 0 && (
        <Card className="p-4 border-0 shadow-sm mb-6">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Sessions by Mode</h3>
          <div className="space-y-2">
            {Object.entries(byMode).map(([mode, count]) => (
              <div key={mode} className="flex items-center gap-3">
                <p className="text-sm font-medium text-foreground capitalize w-28">{mode}</p>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: totalSessions > 0 ? `${(count / totalSessions) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Session History</h3>
          <div className="space-y-2">
            {sessions.slice(0, 20).map((sess) => (
              <Card key={sess.sessionId} className="p-3 border-0 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{sess.mode}</p>
                    <p className="text-xs text-muted-foreground">{sess.accuracy}% accuracy · {timeAgo(sess.completedAt)}</p>
                  </div>
                  <span className="font-bold text-foreground text-sm">{sess.score.toLocaleString()} pts</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <Card className="p-8 border-0 shadow-sm text-center mb-6">
          <p className="text-muted-foreground text-sm">No sessions yet. Play a game to see your stats here!</p>
          <Button className="mt-4" onClick={() => router.push("/play")}>Play Now</Button>
        </Card>
      )}

      {/* Reset */}
      <div className="border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear local stats
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Stats are stored in your browser only. Clearing browser storage or switching devices resets your history.
      </p>
    </div>
  )
}
