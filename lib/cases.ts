import casesData from "@/data/cases.json"
import type { Case, CasesJsonCase, Difficulty, Specialty } from "@/lib/types"

const rawCases = casesData as CasesJsonCase[]

const DEFAULT_DIFFICULTY: Difficulty = "standard"
const DEFAULT_SPECIALTY: Specialty = "emergency"

function normalizeKey(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ")
}

function getMapFromEntries(entries: Array<Record<string, string | undefined>>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const entry of entries) {
    for (const [rawKey, value] of Object.entries(entry)) {
      if (value !== undefined) {
        result[normalizeKey(rawKey)] = value
      }
    }
  }
  return result
}


function toCase(raw: CasesJsonCase): Case {
  const findingMap = getMapFromEntries(raw.physicalExamination.findings ?? [])
  const chiefComplaint =
    findingMap["general"] ?? `Patient with ${raw.pastMedicalHistory[0] ?? "medical concerns"}`

  return {
    id: raw.caseId,
    difficulty: raw.difficulty ?? DEFAULT_DIFFICULTY,
    specialty: raw.specialty ?? DEFAULT_SPECIALTY,
    patient_persona: {
      age: raw.age,
      sex: raw.gender,
      chief_complaint: chiefComplaint,
      history: raw.pastMedicalHistory.join(", "),
    },
    physicalExamination: raw.physicalExamination,
    question_text: "What is the most likely diagnosis?",
    answer_format: "mcq",
    options: raw.diagnosisOptions,
    correct_answer: raw.correctOption,
    explanation: "",
  }
}

const allCases = rawCases.map(toCase)
const hasDifficultyMetadata = rawCases.some((c) => c.difficulty !== undefined)
const hasSpecialtyMetadata = rawCases.some((c) => c.specialty !== undefined)

export function getCases(opts: {
  difficulty?: Difficulty
  specialty?: Specialty | "mixed"
  count: number
}): Case[] {
  let pool = allCases

  // Difficulty/specialty are not yet present in the new JSON schema for all rows.
  // Only filter when metadata exists so game modes still receive cases.
  if (opts.difficulty && hasDifficultyMetadata) {
    pool = pool.filter((c) => c.difficulty === opts.difficulty)
  }

  if (opts.specialty && opts.specialty !== "mixed" && hasSpecialtyMetadata) {
    pool = pool.filter((c) => c.specialty === opts.specialty)
  }

  // Fisher-Yates shuffle then slice
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, Math.min(opts.count, shuffled.length))
}

export function getCaseById(id: string): Case | undefined {
  return allCases.find((c) => c.id === id)
}

export function getCasesByIds(ids: string[]): Case[] {
  return ids.map((id) => allCases.find((c) => c.id === id)).filter(Boolean) as Case[]
}

export function stripAnswers(
  c: Case
): Omit<Case, "correct_answer" | "accepted_synonyms" | "explanation" | "distractors"> {
  const { correct_answer: _ca, accepted_synonyms: _as, explanation: _ex, distractors: _d, ...safe } = c
  return safe
}

export { allCases }
