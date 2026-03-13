"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Users, Trophy, Target, TrendingUp, Swords, Zap, BookOpen, ChevronRight, LogIn } from "lucide-react"

interface Stats {
  sessions: {
    sessionId: string
    mode: string
    score: number
    accuracy: number
    completedAt: number
  }[]
  accuracyBySpecialty: Record<string, { correct: number; total: number }>
}

interface Identity {
  guestId: string
  displayName: string
  avatarColor: string
}

export default function DashboardPage() {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [stats, setStats] = useState<Stats>({ sessions: [], accuracyBySpecialty: {} })

  useEffect(() => {
    const idRaw = localStorage.getItem("rxarena_identity")
    if (idRaw) setIdentity(JSON.parse(idRaw))

    const statsRaw = localStorage.getItem("rxarena_stats")
    if (statsRaw) setStats(JSON.parse(statsRaw))
  }, [])

  const recentSessions = stats.sessions.slice(0, 3)
  const totalSessions = stats.sessions.length
  const avgAccuracy = totalSessions > 0
    ? Math.round(stats.sessions.reduce((s, sess) => s + sess.accuracy, 0) / totalSessions)
    : 0
  const bestScore = totalSessions > 0
    ? Math.max(...stats.sessions.map((s) => s.score))
    : 0

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
            style={{ backgroundColor: identity?.avatarColor ?? "#6366f1" }}
          >
            {identity?.displayName?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">RXArena</h1>
            <p className="text-sm text-muted-foreground">
              {identity ? `Welcome, ${identity.displayName}` : "Welcome back"}
            </p>
          </div>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 border-0 shadow-sm">
          <Target className="w-4 h-4 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <TrendingUp className="w-4 h-4 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{avgAccuracy}%</p>
          <p className="text-xs text-muted-foreground">Accuracy</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <Trophy className="w-4 h-4 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{bestScore.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Best Score</p>
        </Card>
      </div>

      {/* Quick play */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Link href="/play">
          <Button className="w-full h-14 flex-col gap-1 shadow-lg shadow-primary/20" size="lg">
            <Play className="w-5 h-5 fill-current" />
            <span className="text-xs font-medium opacity-90">Solo Play</span>
          </Button>
        </Link>
        <Link href="/room/join">
          <Button variant="outline" className="w-full h-14 flex-col gap-1" size="lg">
            <LogIn className="w-5 h-5" />
            <span className="text-xs font-medium text-muted-foreground">Join Room</span>
          </Button>
        </Link>
        <Link href="/room/create">
          <Button variant="outline" className="w-full h-14 flex-col gap-1" size="lg">
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium text-muted-foreground">Host Room</span>
          </Button>
        </Link>
      </div>

      {/* Mode quick-links */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Practice", icon: BookOpen, href: "/play?mode=practice", color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Competitive", icon: Swords, href: "/play?mode=competitive", color: "text-primary bg-primary/10" },
          { label: "Blitz", icon: Zap, href: "/play?mode=blitz", color: "text-amber-500 bg-amber-500/10" },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.label} href={item.href}>
              <Card className="p-4 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow text-center">
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Recent Sessions</h2>
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View all <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {recentSessions.map((sess, index) => (
              <Card key={`${sess.sessionId}-${sess.completedAt}-${index}`} className="p-4 border-0 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm capitalize">{sess.mode}</p>
                    <p className="text-xs text-muted-foreground">{sess.accuracy}% accuracy</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{sess.score.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard teaser */}
      <Link href="/leaderboard">
        <Card className="p-4 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Weekly Leaderboard</h3>
                <p className="text-xs text-muted-foreground">See where you rank globally</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>
      </Link>
    </div>
  )
}
