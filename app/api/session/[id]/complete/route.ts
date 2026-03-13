import { NextRequest, NextResponse } from "next/server"
import { getGuestIdFromRequest } from "@/lib/identity"
import { getSession, completeSession } from "@/lib/session"
import { getCaseById } from "@/lib/cases"
import { updateBestScore } from "@/lib/leaderboard"
import { redis } from "@/lib/redis"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const guestId = getGuestIdFromRequest(req)
  if (!guestId) return NextResponse.json({ error: "No identity" }, { status: 401 })

  const session = await getSession(id)
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (session.guest_id !== guestId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const completed = await completeSession(id)
  if (!completed) return NextResponse.json({ error: "Failed to complete" }, { status: 500 })

  // Push to leaderboard for ranked modes
  if (session.mode === "competitive" || session.mode === "blitz") {
    const raw = await redis.get(`guest:${guestId}`)
    const guest = raw ? JSON.parse(raw) : null
    if (guest) {
      await updateBestScore(
        session.mode,
        guestId,
        guest.display_name,
        guest.avatar_color,
        session.score
      )
    }
  }

  const revealAnswers = session.mode !== "competitive"

  // Build answer review payload
  const review = session.answers.map((a) => {
    const c = getCaseById(a.case_id)
    return {
      caseId: a.case_id,
      question: c?.question_text ?? "",
      options: c?.options ?? [],
      submittedAnswer: a.submitted_answer,
      correctAnswer: revealAnswers ? (c?.correct_answer ?? 0) : null,
      isCorrect: a.is_correct,
      scoreAwarded: a.score_awarded,
      responseTimeMs: a.response_time_ms,
      explanation: revealAnswers ? (c?.explanation ?? "") : null,
    }
  })

  return NextResponse.json({
    sessionId: id,
    mode: session.mode,
    score: session.score,
    totalCorrect: session.answers.filter((a) => a.is_correct).length,
    totalQuestions: session.case_ids.length,
    review,
    submittedToLeaderboard: session.mode !== "practice",
  })
}
