"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import type { Case } from "@/lib/types";

type SafeCase = Omit<
  Case,
  "correct_answer" | "accepted_synonyms" | "explanation" | "distractors"
>;

interface SessionData {
  sessionId: string;
  cases: SafeCase[];
  mode: string;
  difficulty: string;
  specialty: string;
  timeLimitMs: number | null;
  startedAt: number;
}

interface AnswerResult {
  isCorrect: boolean;
  scoreAwarded: number;
  correctAnswer: number | null;
  explanation: string | null;
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function GameSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null);
  const [blitzTimeMs, setBlitzTimeMs] = useState<number>(30_000);
  const [timedOut, setTimedOut] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [pmhModalOpen, setPmhModalOpen] = useState(false);

  // Load session from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem(`rxarena_session_${sessionId}`);
    if (!raw) {
      router.push("/play");
      return;
    }
    const data = JSON.parse(raw) as SessionData;
    // Evict stale sessions that predate the physicalExamination schema
    if (data.cases?.length && !data.cases[0].physicalExamination) {
      sessionStorage.removeItem(`rxarena_session_${sessionId}`);
      router.push("/play");
      return;
    }
    setSessionData(data);
    if (data.timeLimitMs) setTimeRemainingMs(data.timeLimitMs);
    if (data.mode === "blitz") setBlitzTimeMs(30_000);
    setQuestionStartTime(Date.now());
  }, [sessionId, router]);

  // Competitive total timer
  useEffect(() => {
    if (!sessionData || sessionData.mode !== "competitive" || result) return;
    const interval = setInterval(() => {
      if (!sessionData.timeLimitMs) return;
      const elapsed = Date.now() - sessionData.startedAt;
      const remaining = sessionData.timeLimitMs - elapsed;
      setTimeRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        finishSession();
      }
    }, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, result]);

  // Blitz per-question timer
  useEffect(() => {
    if (!sessionData || sessionData.mode !== "blitz" || result || timedOut)
      return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - questionStartTime;
      const remaining = 30_000 - elapsed;
      setBlitzTimeMs(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, questionStartTime, result, timedOut]);

  const handleTimeout = useCallback(async () => {
    if (!sessionData || timedOut || result) return;
    setTimedOut(true);
    const c = sessionData.cases[currentIndex];
    // Submit a wrong answer implicitly (timeout = incorrect, no score)
    await fetch(`/api/session/${sessionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: c.id,
        answer: -1,
        responseTimeMs: 30_000,
      }),
    });
    // For blitz, auto-advance after showing timeout
    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= sessionData.cases.length) {
        finishSession();
      } else {
        setCurrentIndex(nextIndex);
        setSelected(null);
        setResult(null);
        setTimedOut(false);
        setBlitzTimeMs(30_000);
        setQuestionStartTime(Date.now());
      }
    }, 1500);
  }, [sessionData, currentIndex, sessionId, timedOut, result]);

  async function handleSubmit() {
    if (selected === null || !sessionData || submitting) return;
    setSubmitting(true);
    const responseTimeMs = Date.now() - questionStartTime;
    const c = sessionData.cases[currentIndex];

    try {
      const res = await fetch(`/api/session/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: c.id,
          answer: selected,
          responseTimeMs,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as AnswerResult;
      setResult(data);
      setScore((prev) => prev + data.scoreAwarded);

      // In blitz/competitive, auto-advance after brief pause
      if (sessionData.mode !== "practice") {
        setTimeout(() => {
          const nextIndex = currentIndex + 1;
          if (nextIndex >= sessionData.cases.length) {
            finishSession();
          } else {
            setCurrentIndex(nextIndex);
            setSelected(null);
            setResult(null);
            setTimedOut(false);
            setBlitzTimeMs(30_000);
            setQuestionStartTime(Date.now());
          }
        }, 1000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (!sessionData) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= sessionData.cases.length) {
      finishSession();
      return;
    }
    setCurrentIndex(nextIndex);
    setSelected(null);
    setResult(null);
    setTimedOut(false);
    setBlitzTimeMs(30_000);
    setQuestionStartTime(Date.now());
  }

  async function finishSession() {
    if (!sessionData) return;
    try {
      const res = await fetch(`/api/session/${sessionId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem(
          `rxarena_result_${sessionId}`,
          JSON.stringify(data),
        );
        router.push(`/play/${sessionId}/results`);
      }
    } catch {
      router.push(`/play/${sessionId}/results`);
    }
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  const currentCase = sessionData.cases[currentIndex];
  const isPractice = sessionData.mode === "practice";
  const isBlitz = sessionData.mode === "blitz";
  const isCompetitive = sessionData.mode === "competitive";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border py-2 px-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {currentIndex + 1}/{sessionData.cases.length}
            </span>

            {isBlitz && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  blitzTimeMs <= 10_000
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono font-medium">
                  {formatTime(blitzTimeMs)}
                </span>
              </div>
            )}

            {isCompetitive && timeRemainingMs !== null && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  timeRemainingMs <= 60_000
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono font-medium">
                  {formatTime(timeRemainingMs)}
                </span>
              </div>
            )}
          </div>

          <div className="text-sm font-semibold text-primary">{score} pts</div>
        </div>

        {/* Progress bar */}
        <div className="max-w-4xl mx-auto mt-2">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + (result ? 1 : 0)) / sessionData.cases.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </header>

      <div className="p-3 md:p-6 max-w-4xl mx-auto">
        {/* Patient Card */}
        <Card className="p-3 mb-3 border-0 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground leading-tight text-sm mb-1">
                {currentCase.patient_persona.age}yo{" "}
                {currentCase.patient_persona.sex}
              </h3>
              <div className="flex flex-wrap gap-1">
                {(currentCase.physicalExamination?.vitals ?? []).map(
                  (vital) => {
                    const [label, value] = Object.entries(vital)[0];
                    const key = label.toLowerCase();
                    const labelColor =
                      key.includes("blood pressure") || key.includes("bp")
                        ? "text-rose-500"
                        : key.includes("pulse") ||
                            key.includes("hr") ||
                            key.includes("heart")
                          ? "text-pink-500"
                          : key.includes("temp")
                            ? "text-amber-500"
                            : key.includes("respiratory") || key.includes("rr")
                              ? "text-blue-500"
                              : key.includes("spo2") ||
                                  key.includes("oxygen") ||
                                  key.includes("o2")
                                ? "text-teal-500"
                                : "text-muted-foreground";
                    return (
                      <div
                        key={label}
                        className="flex items-center gap-1 px-2 py-0.5 bg-muted/70 rounded-md"
                      >
                        <span
                          className={`text-[10px] font-medium ${labelColor}`}
                        >
                          {label}:
                        </span>
                        <span className="text-[10px] font-semibold text-foreground">
                          {value}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>

          {/* PMH + Physical Exam side-by-side */}
          <div className="grid grid-cols-2 gap-2 items-stretch">
            {/* PMH card */}
            <button
              onClick={() => setPmhModalOpen(true)}
              className="text-left bg-muted/60 rounded-lg px-2.5 py-2 group hover:bg-muted transition-colors h-full flex flex-col justify-start"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-amber-500">
                  PMH
                </span>
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                  full report
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug line-clamp-3">
                {currentCase.patient_persona.history
                  .split(", ")
                  .slice(0, 3)
                  .map((item) => `• ${item}`)
                  .join("  ")}
                {currentCase.patient_persona.history.split(", ").length > 3 &&
                  ` +${currentCase.patient_persona.history.split(", ").length - 3} more`}
              </p>
            </button>

            {/* Physical exam card */}
            <button
              onClick={() => setExamModalOpen(true)}
              className="text-left bg-muted/60 rounded-lg px-2.5 py-2 group hover:bg-muted transition-colors h-full flex flex-col justify-start"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                  <Stethoscope className="w-2.5 h-2.5" /> Physical Exam
                </span>
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                  full report
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug line-clamp-3">
                {Object.values(
                  (currentCase.physicalExamination?.findings ?? []).find(
                    (f) => Object.keys(f)[0].toLowerCase() === "general",
                  ) ?? {},
                )[0] ?? "—"}
              </p>
            </button>
          </div>
        </Card>

        {/* PMH Modal */}
        <Dialog open={pmhModalOpen} onOpenChange={setPmhModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-500">
                Past Medical History
              </DialogTitle>
            </DialogHeader>
            <ul className="mt-2 space-y-2">
              {currentCase.patient_persona.history.split(", ").map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2"
                >
                  <span className="text-amber-500 mt-px">•</span>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>

        {/* Physical Exam Modal */}
        <Dialog open={examModalOpen} onOpenChange={setExamModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                Physical Examination
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {(currentCase.physicalExamination?.findings ?? []).map(
                (finding) => {
                  const [label, value] = Object.entries(finding)[0];
                  return (
                    <div
                      key={label}
                      className="rounded-lg bg-muted/50 px-3 py-2.5"
                    >
                      <p className="text-xs font-semibold text-primary mb-0.5">
                        {label}
                      </p>
                      <p className="text-sm text-foreground leading-snug">
                        {value}
                      </p>
                    </div>
                  );
                },
              )}
              {currentCase.imaging_text && (
                <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-primary mb-0.5">
                    Imaging
                  </p>
                  <p className="text-sm text-foreground leading-snug">
                    {currentCase.imaging_text}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Question */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">
            {currentCase.question_text}
          </h2>
        </div>

        {/* Blitz timeout banner */}
        {timedOut && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-destructive">
              Time&apos;s up! Moving to next question…
            </p>
          </div>
        )}

        {/* Answer Options */}
        <div className="space-y-3 mb-6">
          {currentCase.options.map((option, index) => {
            const isSelected = selected === index;
            const isCorrectAnswer = result?.correctAnswer === index;
            const isWrongSelected = result && isSelected && !isCorrectAnswer;

            let cardClass = "border-0 shadow-sm cursor-pointer transition-all";
            if (result || timedOut) {
              if (isCorrectAnswer && isPractice)
                cardClass += " bg-emerald-500/10 border-2 border-emerald-500";
              else if (isWrongSelected)
                cardClass += " bg-destructive/10 border-2 border-destructive";
            } else if (isSelected) {
              cardClass += " border-2 border-primary bg-primary/5";
            } else {
              cardClass += " hover:border-border hover:shadow-md";
            }

            return (
              <Card
                key={index}
                className={`p-4 ${cardClass}`}
                onClick={() => !result && !timedOut && setSelected(index)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium ${
                      result && isCorrectAnswer && isPractice
                        ? "bg-emerald-500 text-white"
                        : isWrongSelected
                          ? "bg-destructive text-destructive-foreground"
                          : isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {result && isCorrectAnswer && isPractice ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isWrongSelected ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {option}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Practice Explanation */}
        {result && isPractice && result.explanation && (
          <Card className="p-4 mb-6 border-0 shadow-sm bg-emerald-500/5">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-1">
                  {result.isCorrect
                    ? `Correct! +${result.scoreAwarded} pts`
                    : "Incorrect"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.explanation}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Competitive/Blitz brief feedback */}
        {result && !isPractice && (
          <div
            className={`mb-6 p-3 rounded-xl text-center ${result.isCorrect ? "bg-emerald-500/10" : "bg-muted"}`}
          >
            <p
              className={`text-sm font-medium ${result.isCorrect ? "text-emerald-600" : "text-muted-foreground"}`}
            >
              {result.isCorrect
                ? `+${result.scoreAwarded} pts`
                : "Incorrect — 0 pts"}
            </p>
          </div>
        )}

        {/* Action Button */}
        {!result && !timedOut && (
          <Button
            onClick={handleSubmit}
            disabled={selected === null || submitting}
            className="w-full h-12"
            size="lg"
          >
            {submitting ? "Submitting…" : "Submit Answer"}
          </Button>
        )}

        {result && isPractice && (
          <Button onClick={handleNext} className="w-full h-12" size="lg">
            {currentIndex + 1 >= sessionData.cases.length
              ? "See Results"
              : "Next Question"}
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
