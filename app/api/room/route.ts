import { NextRequest, NextResponse } from "next/server"
import { getGuestIdFromRequest } from "@/lib/identity"
import { redis } from "@/lib/redis"
import { createRoom } from "@/lib/room"
import type { GameMode, Specialty } from "@/lib/types"

export async function POST(req: NextRequest) {
  const guestId = getGuestIdFromRequest(req)
  if (!guestId) return NextResponse.json({ error: "No identity" }, { status: 401 })

  const raw = await redis.get(`guest:${guestId}`)
  if (!raw) return NextResponse.json({ error: "Guest not found" }, { status: 401 })
  const guest = JSON.parse(raw)

  const body = await req.json().catch(() => ({}))
  const { mode, specialty, questionCount, scoreboardVisible } = body as {
    mode?: Exclude<GameMode, "practice">
    specialty?: Specialty | "mixed"
    questionCount?: number
    scoreboardVisible?: boolean
  }

  if (!mode || !["competitive", "blitz"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
  }
  const room = await createRoom({
    hostGuestId: guestId,
    hostDisplayName: guest.display_name,
    hostAvatarColor: guest.avatar_color,
    mode,
    specialty: specialty ?? "mixed",
    questionCount: questionCount ?? 5,
    scoreboardVisible: scoreboardVisible ?? true,
  })

  const baseUrl = req.headers.get("origin") ?? ""
  return NextResponse.json({
    roomId: room.id,
    joinCode: room.join_code,
    roomUrl: `${baseUrl}/room/${room.join_code}`,
  })
}
