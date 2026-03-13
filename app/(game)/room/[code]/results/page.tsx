import { cookies } from "next/headers"
import Link from "next/link"
import { COOKIE_NAME } from "@/lib/identity"
import { getRoomCaseIds, getRoomResult } from "@/lib/room"
import { getCaseById } from "@/lib/cases"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trophy, Clock } from "lucide-react"

export default async function RoomResultsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const joinCode = code.toUpperCase()

  const cookieStore = await cookies()
  const myGuestId = cookieStore.get(COOKIE_NAME)?.value

  const result = await getRoomResult(joinCode)

  if (!result) {
    return (
      <div className="p-4 md:p-8 max-w-lg mx-auto">
        <div className="text-center py-20">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Results Expired</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Room results are only available for 24 hours after the match ends.
          </p>
          <Link href="/dashboard">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const expiresAt = new Date(result.expires_at)
  const hoursLeft = Math.max(0, Math.floor((result.expires_at - Date.now()) / 3_600_000))
  const caseIds = await getRoomCaseIds(result.room_id)
  const answerKey = caseIds
    .map((caseId) => getCaseById(caseId))
    .filter((c): c is NonNullable<ReturnType<typeof getCaseById>> => Boolean(c))
    .map((c, index) => ({
      index: index + 1,
      question: `${c.patient_persona.age}yo ${c.patient_persona.sex} - ${c.patient_persona.chief_complaint}`,
      correctOption: c.options[c.correct_answer] ?? "Unknown",
      explanation: c.explanation,
    }))

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Room Results</h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {result.mode} · Room {joinCode}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Expires {hoursLeft > 0 ? `in ${hoursLeft}h` : "soon"} ({expiresAt.toLocaleString()})
        </p>
      </header>

      {/* Top 3 */}
      {result.final_rankings.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-6">
          {[1, 0, 2].map((pos) => {
            const r = result.final_rankings[pos]
            return (
              <div key={pos} className={`flex-1 text-center ${pos === 0 ? "max-w-[140px]" : "max-w-[110px]"}`}>
                <div
                  className={`${pos === 0 ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm"} rounded-full flex items-center justify-center font-bold text-white mx-auto`}
                  style={{ backgroundColor: r.avatar_color }}
                >
                  {r.display_name.charAt(0).toUpperCase()}
                </div>
                <div className={`mt-2 p-3 rounded-xl ${pos === 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/60"}`}>
                  <Trophy className={`w-4 h-4 mx-auto mb-1 ${pos === 0 ? "text-amber-500" : "text-muted-foreground/50"}`} />
                  <p className={`${pos === 0 ? "text-sm font-bold" : "text-xs font-semibold"} text-foreground truncate`}>
                    {r.display_name}
                    {r.guest_id === myGuestId && " (you)"}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.score.toLocaleString()} pts</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-1.5 mb-5">
        {result.final_rankings.map((r) => (
          <Card
            key={r.guest_id}
            className={`p-2.5 border-0 shadow-sm ${r.guest_id === myGuestId ? "border-2 border-primary" : ""}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-8 text-center font-bold text-muted-foreground text-sm">#{r.rank}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                style={{ backgroundColor: r.avatar_color }}
              >
                {r.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {r.display_name}
                  {r.guest_id === myGuestId && <span className="ml-1 text-xs text-primary">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{r.correct_count} correct</p>
              </div>
              <span className="font-bold text-foreground">{r.score.toLocaleString()}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Correct answers for all room questions */}
      {answerKey.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-foreground mb-3">Correct Answers</h2>
          <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-border p-2 space-y-1.5 pr-1">
            {answerKey.map((item) => (
              <Card key={item.index} className="p-2.5 border-0 shadow-sm">
                <p className="text-sm font-medium text-foreground mb-1">
                  <span className="text-xs text-muted-foreground mr-1">Q{item.index}</span>
                  {item.question}
                </p>
                <p className="text-sm text-foreground leading-snug">
                  <span className="font-semibold">Answer:</span> {item.correctOption}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.explanation}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Link href="/room/create">
          <Button className="w-full h-12">Play Again</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline" className="w-full h-12">Home</Button>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Room results are private to this room and expire 24 hours after completion.
      </p>
    </div>
  )
}
