import casesData from "@/data/cases.json"
import type { Case, CasesJsonCase, Specialty } from "@/lib/types"

const rawCases = casesData as CasesJsonCase[]

const DEFAULT_SPECIALTY: Specialty = "emergency"

function normalizeSpecialty(input?: Specialty | string): Specialty {
  if (!input) return DEFAULT_SPECIALTY

  const normalized = input.trim().toLowerCase().replace(/[\s-]+/g, "_")

  switch (normalized) {
    case "cardiology":
    case "neurology":
    case "pulmonology":
    case "gastroenterology":
    case "endocrinology":
    case "infectious_disease":
    case "nephrology":
    case "hematology":
    case "emergency":
      return normalized
    default:
      return DEFAULT_SPECIALTY
  }
}

function normalizeStringList(input: CasesJsonCase["pastSurgicalHistory"]): string[] {
  if (!input) return []
  if (Array.isArray(input)) return input.filter(Boolean)
  return [input].filter(Boolean)
}

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
  const pastMedicalHistory = raw.pastMedicalHistory ?? []
  const socialHistory = raw.socialHistory?.trim() || undefined

  return {
    id: raw.caseId,
    specialty: normalizeSpecialty(raw.specialty ?? raw.medicalField),
    patient_persona: {
      age: raw.age,
      sex: raw.gender,
      chief_complaint: chiefComplaint,
      history: pastMedicalHistory.join(", "),
      past_medical_history: pastMedicalHistory,
      social_history: socialHistory,
      allergies: raw.allergies ?? [],
      medications_on_admission: raw.medicationsOnAdmission ?? [],
      medications_at_home: raw.medicationsAtHome ?? [],
      past_surgical_history: normalizeStringList(raw.pastSurgicalHistory),
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

export function getCases(opts: {
  specialty?: Specialty | "mixed"
  count: number
}): Case[] {
  let pool = allCases

  if (opts.specialty && opts.specialty !== "mixed") {
    const bySpecialty = pool.filter((c) => c.specialty === opts.specialty)
    // Specialty selection is user-driven, so keep this strict:
    // no matches should surface as "no cases" to the caller.
    pool = bySpecialty
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
