export type GameMode = "practice" | "competitive" | "blitz"
export type Specialty =
  | "cardiology"
  | "neurology"
  | "pulmonology"
  | "gastroenterology"
  | "endocrinology"
  | "infectious_disease"
  | "nephrology"
  | "hematology"
  | "emergency"
  | "mixed"

export interface CasesJsonPhysicalExam {
  vitals: Array<Record<string, string | undefined>>
  findings: Array<Record<string, string | undefined>>
}

// Raw schema loaded from data/cases.json
export interface CasesJsonCase {
  age: number
  gender: string
  caseId: string
  subjectId: number | null
  hadmId: number | null
  medicationsAtHome?: string[]
  allergies?: string[]
  socialHistory?: string | null
  pastSurgicalHistory?: string[] | string | null
  medicationsOnAdmission?: string[]
  medicalField?: string
  diagnosisOptions: string[]
  correctOption: number
  pastMedicalHistory: string[]
  physicalExamination: CasesJsonPhysicalExam
  // Optional fields for future enrichment
  specialty?: Specialty
}

export interface CasePatientPersona {
  age: number
  sex: string
  chief_complaint: string
  history: string
  past_medical_history?: string[]
  social_history?: string
  allergies?: string[]
  medications_on_admission?: string[]
  medications_at_home?: string[]
  past_surgical_history?: string[]
}

export interface Case {
  id: string
  specialty: Specialty
  patient_persona: CasePatientPersona
  physicalExamination: CasesJsonPhysicalExam
  labs?: string[]
  imaging_text?: string
  question_text: string
  answer_format: "mcq"
  options: string[]
  correct_answer: number
  accepted_synonyms?: string[]
  explanation: string
  distractors?: { option: string; explanation: string }[]
}

export interface Player {
  guest_id: string
  display_name: string
  avatar_color: string
  joined_at: number
  is_connected: boolean
}

export interface Room {
  id: string
  host_guest_id: string
  join_code: string
  mode: Exclude<GameMode, "practice">
  specialty: Specialty
  question_count: number
  status: "lobby" | "in_progress" | "completed" | "cancelled"
  scoreboard_visible: boolean
  created_at: number
  expires_at: number
}

export interface RoomState {
  current_question: number
  started_at: number
  timer_end: number
}

export interface AnswerRecord {
  answer: number
  time_ms: number
  score: number
  is_correct: boolean
}

export interface RoomScore {
  guest_id: string
  display_name: string
  avatar_color: string
  score: number
  correct_count: number
  total_time_ms: number
  rank: number
}

export interface RoomResult {
  room_id: string
  join_code: string
  mode: string
  specialty: string
  final_rankings: RoomScore[]
  completed_at: number
  expires_at: number
}

export interface SoloSession {
  id: string
  guest_id: string
  display_name: string
  mode: GameMode
  specialty: Specialty
  case_ids: string[]
  current_index: number
  score: number
  answers: SessionAnswer[]
  started_at: number
  time_limit_ms: number | null
}

export interface SessionAnswer {
  case_id: string
  submitted_answer: number
  is_correct: boolean
  response_time_ms: number
  score_awarded: number
}

export interface LeaderboardEntry {
  rank: number
  guest_id: string
  display_name: string
  avatar_color: string
  score: number
}

// SSE event payloads
export type SSEEvent =
  | { type: "player_joined"; payload: { guest_id: string; display_name: string; avatar_color: string } }
  | { type: "player_left"; payload: { guest_id: string } }
  | { type: "lobby_updated"; payload: { players: Player[]; settings: Partial<Room> } }
  | { type: "game_started"; payload: { total_questions: number; timer_end: number | null } }
  | { type: "question_started"; payload: { index: number; case_data: Omit<Case, "correct_answer" | "accepted_synonyms" | "explanation" | "distractors">; timer_end: number | null } }
  | { type: "answer_accepted"; payload: { guest_id: string; question_index: number } }
  | { type: "question_ended"; payload: { index: number; correct_answer: number; explanation: string; scores: RoomScore[] } }
  | { type: "scoreboard_updated"; payload: { rankings: RoomScore[] } }
  | { type: "match_ended"; payload: { final_rankings: RoomScore[]; room_expires_at: number } }
  | { type: "room_cancelled"; payload: Record<string, never> }
  | { type: "heartbeat"; payload: { ts: number } }
