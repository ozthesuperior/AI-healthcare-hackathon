import { NextRequest, NextResponse } from "next/server"
import { getGuestIdFromRequest } from "@/lib/identity"
import { redis } from "@/lib/redis"
import { createSession } from "@/lib/session"
import { getCasesByIds, stripAnswers } from "@/lib/cases"
import type { GameMode, Specialty } from "@/lib/types"

export async function POST(req: NextRequest) {
  const guestId = getGuestIdFromRequest(req)
  if (!guestId) return NextResponse.json({ error: "No identity" }, { status: 401 })

  const raw = await redis.get(`guest:${guestId}`)
  if (!raw) return NextResponse.json({ error: "Guest not found" }, { status: 401 })

  const guest = JSON.parse(raw)

  const body = await req.json().catch(() => ({}))
  const { mode, specialty } = body as {
    mode?: GameMode
    specialty?: Specialty | "mixed"
  }

  if (!mode || !["practice", "competitive", "blitz"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
  }
  const session = await createSession({
    guestId,
    displayName: guest.display_name,
    mode,
    specialty: specialty ?? "mixed",
  })

  const cases = getCasesByIds(session.case_ids).map(stripAnswers)
  if (cases.length === 0) {
    return NextResponse.json(
      { error: "No cases available for this specialty. Choose another specialty or Mixed." },
      { status: 422 }
    )
  }

  return NextResponse.json({
    sessionId: session.id,
    cases,
    mode: session.mode,
    specialty: session.specialty,
    timeLimitMs: session.time_limit_ms,
    startedAt: session.started_at,
  })
}
