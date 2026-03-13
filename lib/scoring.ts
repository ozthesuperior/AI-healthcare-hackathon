import type { RoomScore } from "@/lib/types"

const BASE_POINTS = 200

const SPEED_BONUS_WINDOW_MS = 60_000
const SPEED_BONUS_MAX = 0.5

export function calcScore(elapsedMs: number, isCorrect: boolean): number {
  if (!isCorrect) return 0
  const base = BASE_POINTS
  const ratio = Math.max(0, 1 - elapsedMs / SPEED_BONUS_WINDOW_MS)
  const bonus = Math.round(base * ratio * SPEED_BONUS_MAX)
  return base + bonus
}

export function basePoints(): number {
  return BASE_POINTS
}

/**
 * Sort and assign ranks to an array of RoomScore objects.
 * Primary sort: score descending.
 * Tie-break: total_time_ms ascending (fewer ms = better).
 */
export function rankScores(scores: Omit<RoomScore, "rank">[]): RoomScore[] {
  const sorted = [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.total_time_ms - b.total_time_ms
  })
  return sorted.map((s, i) => ({ ...s, rank: i + 1 }))
}
