"use client";

import { useMemo, useState } from "react";
import posthog from "posthog-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ResultView from "@/components/quiz/ResultView";
import { QUESTIONS, type Answers, type Question } from "@/lib/quiz/schema";
import { computeResult } from "@/lib/quiz/scoring";

function isAnswered(q: Question, value: string | string[] | undefined): boolean {
  if (q.type === "single") return typeof value === "string" && value.length > 0;
  return Array.isArray(value) && value.length > 0;
}

function SingleSelect({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {question.options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`w-full text-left border p-4 transition-colors ${
              selected ? "border-ink bg-ink text-white" : "border-border-default hover:border-ink"
            }`}
          >
            <span className="text-base">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MultiSelect({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const max = question.maxSelections ?? Infinity;
  return (
    <div className="space-y-2">
      {question.options.map((opt) => {
        const checked = value.includes(opt.id);
        const atLimit = !checked && value.length >= max;
        return (
          <label
            key={opt.id}
            className={`flex items-center gap-3 border p-4 cursor-pointer transition-colors ${
              checked ? "border-ink" : "border-border-default hover:border-ink/50"
            } ${atLimit ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Checkbox
              checked={checked}
              disabled={atLimit}
              onCheckedChange={(v) => {
                if (v === true) {
                  if (!atLimit) onChange([...value, opt.id]);
                } else {
                  onChange(value.filter((x) => x !== opt.id));
                }
              }}
            />
            <span className="text-base">{opt.label}</span>
          </label>
        );
      })}
      {max !== Infinity && (
        <p className="text-xs text-ink-muted font-mono uppercase tracking-[0.1em] mt-2">
          {value.length} / {max} selected
        </p>
      )}
    </div>
  );
}

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [finished, setFinished] = useState(false);

  const question = QUESTIONS[step];
  const currentAnswer = answers[question?.id];
  const canAdvance = question ? isAnswered(question, currentAnswer) : false;
  const isLast = step === QUESTIONS.length - 1;

  const result = useMemo(() => (finished ? computeResult(answers) : null), [finished, answers]);

  const setSingle = (qid: string, v: string) => {
    setAnswers((a) => ({ ...a, [qid]: v }));
    posthog.capture("quiz_question_answered", { questionId: qid, value: v });
  };

  const setMulti = (qid: string, v: string[]) => {
    setAnswers((a) => ({ ...a, [qid]: v }));
    posthog.capture("quiz_question_answered", { questionId: qid, value: v });
  };

  const handleNext = () => {
    if (!canAdvance) return;
    if (isLast) {
      setFinished(true);
      const r = computeResult(answers);
      posthog.capture("quiz_completed", {
        state: r.state,
        readiness: r.scores.readiness,
        urgency: r.scores.urgency,
        engagement: r.recommendedEngagement.id,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
  };

  const progressPct = ((step + (finished ? 1 : 0)) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-16">
          {!finished && question && (
            <>
              <div className="mb-12">
                <div className="flex items-baseline justify-between mb-3">
                  <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted">
                    Ready to brief a build?
                  </div>
                  <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted">
                    {String(step + 1).padStart(2, "0")} / {String(QUESTIONS.length).padStart(2, "0")}
                  </div>
                </div>
                <div className="h-px bg-border-default w-full relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-ink transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div key={question.id} className="animate-fade-in">
                <h1 className="text-3xl sm:text-4xl font-black text-ink leading-[1.15] mb-3">
                  {question.prompt}
                </h1>
                {question.helper && (
                  <p className="text-base text-ink-muted mb-8 max-w-xl">{question.helper}</p>
                )}

                {question.type === "single" ? (
                  <SingleSelect
                    question={question}
                    value={typeof currentAnswer === "string" ? currentAnswer : undefined}
                    onChange={(v) => setSingle(question.id, v)}
                  />
                ) : (
                  <MultiSelect
                    question={question}
                    value={Array.isArray(currentAnswer) ? currentAnswer : []}
                    onChange={(v) => setMulti(question.id, v)}
                  />
                )}
              </div>

              <div className="flex items-center justify-between mt-12">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={step === 0}
                >
                  Back
                </Button>
                <Button type="button" onClick={handleNext} disabled={!canAdvance}>
                  {isLast ? "See your result" : "Next"}
                </Button>
              </div>
            </>
          )}

          {finished && result && <ResultView answers={answers} result={result} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
