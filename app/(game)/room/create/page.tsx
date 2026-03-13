"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Swords, Zap } from "lucide-react"
import type { GameMode, Specialty } from "@/lib/types"

const SPECIALTIES: { id: Specialty | "mixed"; label: string }[] = [
  { id: "mixed", label: "Mixed (all)" },
  { id: "cardiology", label: "Cardiology" },
  { id: "neurology", label: "Neurology" },
  { id: "pulmonology", label: "Pulmonology" },
  { id: "endocrinology", label: "Endocrinology" },
  { id: "gastroenterology", label: "Gastroenterology" },
  { id: "infectious_disease", label: "Infectious Disease" },
  { id: "nephrology", label: "Nephrology" },
  { id: "hematology", label: "Hematology" },
  { id: "emergency", label: "Emergency" },
]

export default function CreateRoomPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Exclude<GameMode, "practice">>("competitive")
  const [specialty, setSpecialty] = useState<Specialty | "mixed">("mixed")
  const [questionCount, setQuestionCount] = useState(5)
  const [scoreboardVisible, setScoreboardVisible] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleCreate() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, specialty, questionCount, scoreboardVisible }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to create room")
        return
      }
      const data = await res.json()
      router.push(`/room/${data.joinCode}`)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const optBtn = (
    current: string,
    value: string,
    label: string,
    setter: (v: string) => void
  ) => (
    <button
      key={value}
      type="button"
      onClick={() => setter(value)}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        current === value
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <header className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Create Room</h1>
        <p className="text-muted-foreground text-sm mt-1">Set up a private match for your group</p>
      </header>

      <div className="space-y-5">
        {/* Mode */}
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm font-medium text-foreground mb-3">Game Mode</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: "competitive", label: "Competitive", icon: Swords, desc: "Shared 5-min timer" },
              { id: "blitz", label: "Blitz", icon: Zap, desc: "30s per question" },
            ] as const).map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    mode === m.id ? "border-primary bg-primary/5" : "border-transparent bg-muted hover:bg-muted/80"
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${mode === m.id ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-semibold text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Specialty */}
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm font-medium text-foreground mb-3">Specialty</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) =>
              optBtn(specialty, s.id, s.label, (v) => setSpecialty(v as Specialty | "mixed"))
            )}
          </div>
        </Card>

        {/* Question count */}
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-sm font-medium text-foreground mb-3">Number of Questions</p>
          <div className="flex gap-2">
            {[3, 5, 10].map((n) =>
              optBtn(String(questionCount), String(n), `${n} questions`, (v) => setQuestionCount(Number(v)))
            )}
          </div>
        </Card>

        {/* Scoreboard toggle */}
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Live Scoreboard</p>
              <p className="text-xs text-muted-foreground">Show scores to all players during the match</p>
            </div>
            <button
              type="button"
              onClick={() => setScoreboardVisible(!scoreboardVisible)}
              className={`w-12 h-6 rounded-full transition-colors ${scoreboardVisible ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white mx-0.5 transition-transform ${scoreboardVisible ? "translate-x-6" : ""}`} />
            </button>
          </div>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleCreate} disabled={loading} className="w-full h-12" size="lg">
          {loading ? "Creating room…" : "Create Room"}
        </Button>
      </div>
    </div>
  )
}
