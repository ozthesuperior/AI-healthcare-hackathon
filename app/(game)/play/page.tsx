"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Swords, Zap, ChevronRight } from "lucide-react"
import type { GameMode, Specialty } from "@/lib/types"

type Step = "mode" | "specialty"

const MODES = [
  {
    id: "practice" as GameMode,
    name: "Practice",
    description: "Learn at your own pace with full explanations after each answer",
    icon: BookOpen,
    color: "bg-emerald-500/10 text-emerald-500",
    badge: "No time limit",
  },
  {
    id: "competitive" as GameMode,
    name: "Competitive",
    description: "5 questions in 5 minutes. Score counts toward the weekly leaderboard.",
    icon: Swords,
    color: "bg-primary/10 text-primary",
    badge: "Global ranking",
  },
  {
    id: "blitz" as GameMode,
    name: "Blitz",
    description: "30 seconds per question. Auto-advance on timeout.",
    icon: Zap,
    color: "bg-amber-500/10 text-amber-500",
    badge: "Speed challenge",
  },
]

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

export default function PlayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>("mode")
  const [mode, setMode] = useState<GameMode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const modeParam = searchParams.get("mode")
    if (modeParam === "practice" || modeParam === "competitive" || modeParam === "blitz") {
      setMode(modeParam)
      setStep("specialty")
    }
  }, [searchParams])

  async function startSession(specialty: Specialty | "mixed") {
    if (!mode) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, specialty }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to start session")
        return
      }
      const data = await res.json()
      // Store session data for the game page
      sessionStorage.setItem(`rxarena_session_${data.sessionId}`, JSON.stringify(data))
      router.push(`/play/${data.sessionId}`)
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    if (step === "specialty") setStep("mode")
    else router.push("/dashboard")
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === "mode" ? "Home" : "Back"}
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {step === "mode" && "Choose Mode"}
          {step === "specialty" && "Choose Specialty"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {step === "mode" && "Pick your challenge style"}
          {step === "specialty" && "Focus on a specialty or go mixed"}
        </p>
      </header>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {/* Mode selection */}
      {step === "mode" && (
        <div className="space-y-3">
          {MODES.map((m) => {
            const Icon = m.icon
            return (
              <Card
                key={m.id}
                className="p-5 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                onClick={() => { setMode(m.id); setStep("specialty") }}
              >
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-foreground">{m.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m.badge}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Specialty selection */}
      {step === "specialty" && (
        <div className="space-y-2">
          {SPECIALTIES.map((s) => (
            <Card
              key={s.id}
              className="p-4 border-0 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
              onClick={() => !loading && startSession(s.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{s.label}</span>
                {loading ? (
                  <span className="text-xs text-muted-foreground">Starting…</span>
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
