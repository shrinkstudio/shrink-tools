"use client";

import { useMemo, useState } from "react";
import {
  QUESTIONS,
  visibleQuestions,
  computeEstimate,
  fmtGBP,
  type Answers,
} from "@/lib/calculator/model";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CAL_LINK = "https://cal.com/shrinkstudio/30min";

export default function CalculatorPage() {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const flow = useMemo(() => visibleQuestions(answers), [answers]);
  const current = flow[step];
  const estimate = useMemo(() => computeEstimate(answers), [answers]);

  function select(qid: string, value: string, multi: boolean) {
    setAnswers((prev) => {
      if (!multi) return { ...prev, [qid]: value };
      const existing = (prev[qid] as string[]) || [];
      const next = existing.includes(value)
        ? existing.filter((v) => v !== value)
        : [...existing, value];
      return { ...prev, [qid]: next };
    });
  }

  function isAnswered(qid: string): boolean {
    const v = answers[qid];
    if (Array.isArray(v)) return true; // multi can be empty (optional)
    return typeof v === "string" && v.length > 0;
  }

  function next() {
    // Recompute the flow after this answer (branching may change it).
    const updatedFlow = visibleQuestions(answers);
    if (step >= updatedFlow.length - 1) {
      setDone(true);
    } else {
      setStep(step + 1);
    }
  }

  function back() {
    if (done) {
      setDone(false);
      return;
    }
    if (step > 0) setStep(step - 1);
  }

  function reset() {
    setAnswers({});
    setStep(0);
    setDone(false);
  }

  const progress = done ? 100 : Math.round(((step + 1) / Math.max(flow.length, 1)) * 100);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-secondary">
            Project Calculator
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-medium tracking-tight">
            A real ballpark in under a minute.
          </h1>
          <p className="mt-3 text-ink-secondary max-w-xl">
            A few plain questions. We price it against the same rate card we use
            internally — so the number you get is genuine, not a guess.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 h-1 w-full rounded-full bg-border-default overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {!done && current && (
          <Question
            key={current.id}
            qid={current.id}
            multi={current.kind === "multi"}
            title={current.title}
            subtitle={current.subtitle}
            options={current.options}
            answers={answers}
            onSelect={select}
          />
        )}

        {/* Nav */}
        {!done && current && (
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 0}
              className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-ink-secondary hover:text-ink disabled:opacity-30 transition-colors"
            >
              ← Back
            </button>
            <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted">
              {step + 1} / {flow.length}
            </span>
            <Button onClick={next} disabled={!isAnswered(current.id)}>
              {step >= flow.length - 1 ? "See estimate" : "Next"}
            </Button>
          </div>
        )}

        {done && estimate && (
          <Result estimate={estimate} onBack={back} onReset={reset} calLink={CAL_LINK} />
        )}
      </div>
      </main>
      <Footer />
    </>
  );
}

function Question({
  qid,
  multi,
  title,
  subtitle,
  options,
  answers,
  onSelect,
}: {
  qid: string;
  multi: boolean;
  title: string;
  subtitle?: string;
  options: { value: string; label: string; hint?: string }[];
  answers: Answers;
  onSelect: (qid: string, value: string, multi: boolean) => void;
}) {
  const value = answers[qid];
  const isSelected = (v: string) =>
    Array.isArray(value) ? value.includes(v) : value === v;

  return (
    <div className="animate-[fade-in_0.4s_ease-out]">
      <h2 className="text-2xl font-medium tracking-tight">{title}</h2>
      {subtitle && <p className="mt-2 text-ink-secondary">{subtitle}</p>}
      {multi && (
        <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-muted">
          Select any that apply
        </p>
      )}

      <div className="mt-6 grid gap-3">
        {options.map((opt) => {
          const sel = isSelected(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(qid, opt.value, multi)}
              className={`group flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-all ${
                sel
                  ? "border-ink bg-ink text-white shadow-sm"
                  : "border-border-default bg-white hover:border-border-strong"
              }`}
            >
              <span>
                <span className="block font-medium">{opt.label}</span>
                {opt.hint && (
                  <span
                    className={`mt-0.5 block text-sm ${
                      sel ? "text-white/60" : "text-ink-secondary"
                    }`}
                  >
                    {opt.hint}
                  </span>
                )}
              </span>
              <span
                className={`ml-4 flex h-5 w-5 shrink-0 items-center justify-center border ${
                  multi ? "rounded-md" : "rounded-full"
                } ${sel ? "border-accent bg-accent" : "border-border-strong"}`}
              >
                {sel && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3 text-ink" fill="none">
                    <path
                      d="M2.5 6.5L5 9L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Result({
  estimate,
  onBack,
  onReset,
  calLink,
}: {
  estimate: NonNullable<ReturnType<typeof computeEstimate>>;
  onBack: () => void;
  onReset: () => void;
  calLink: string;
}) {
  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-secondary">
        Your ballpark
      </p>

      {estimate.kind === "range" && (
        <>
          <p className="mt-3 text-4xl sm:text-5xl font-medium tracking-tight tabular-nums">
            {fmtGBP(estimate.low)}
            <span className="text-ink-muted"> – </span>
            {fmtGBP(estimate.high)}
          </p>
          {estimate.note && (
            <p className="mt-3 text-sm text-ink-secondary">{estimate.note}</p>
          )}

          <div className="mt-8 rounded-2xl border border-border-default bg-white overflow-hidden">
            <p className="px-5 py-3 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-muted border-b border-border-default">
              Roughly where it goes
            </p>
            {estimate.breakdown.map((line) => (
              <div
                key={line.area}
                className="flex items-center justify-between px-5 py-3 border-b border-border-default last:border-b-0"
              >
                <span className="text-ink">{line.area}</span>
                <span className="tabular-nums text-ink-secondary">
                  {fmtGBP(line.min)} – {fmtGBP(line.max)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {estimate.kind === "recurring" && (
        <>
          <p className="mt-3 text-4xl sm:text-5xl font-medium tracking-tight tabular-nums">
            {fmtGBP(estimate.monthly)}
            <span className="text-xl text-ink-muted"> / month</span>
          </p>
          <p className="mt-2 text-ink-secondary">{estimate.label} retainer</p>
          {estimate.note && (
            <p className="mt-3 text-sm text-ink-secondary">{estimate.note}</p>
          )}
        </>
      )}

      {estimate.kind === "enquiry" && (
        <p className="mt-3 text-2xl font-medium tracking-tight">{estimate.note}</p>
      )}

      {/* CTA */}
      <div className="mt-8 rounded-2xl bg-ink text-white p-6 sm:p-7">
        <h3 className="text-xl font-medium tracking-tight">Want the real number?</h3>
        <p className="mt-2 text-white/70 text-sm max-w-md">
          Book a 30-minute call and we&apos;ll turn this into a proper scope and a
          fixed proposal — usually within a few days.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="bg-accent text-ink hover:bg-accent-dark">
            <a href={calLink} target="_blank" rel="noreferrer">
              Book a call
            </a>
          </Button>
          <button
            onClick={onReset}
            className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-white/60 hover:text-white transition-colors"
          >
            Start over
          </button>
        </div>
      </div>

      <button
        onClick={onBack}
        className="mt-6 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-ink-secondary hover:text-ink transition-colors"
      >
        ← Change an answer
      </button>

      <p className="mt-8 text-xs text-ink-muted">
        This is an indicative range based on our standard rate card, not a quote.
        Final pricing depends on scope agreed in discovery.
      </p>
    </div>
  );
}
