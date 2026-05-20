"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { QUESTIONS, type Answers } from "@/lib/quiz/schema";
import type { QuizResult } from "@/lib/quiz/scoring";
import { buildShareUrl, slugifyCompany } from "@/lib/quiz/slug";

const SUBMIT_ENDPOINT = "/api/quiz-submit";

type Props = {
  answers: Answers;
  result: QuizResult;
  initialCompany?: string;
  showShareControls?: boolean;
};

type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "error"; message: string };

function jtbdLabels(answers: Answers): string[] {
  const ids = answers["jtbd"];
  if (!Array.isArray(ids)) return [];
  const q = QUESTIONS.find((q) => q.id === "jtbd");
  if (!q) return [];
  return ids
    .map((id) => q.options.find((o) => o.id === id)?.label)
    .filter((x): x is string => Boolean(x));
}

export default function ResultView({
  answers,
  result,
  initialCompany = "",
  showShareControls = true,
}: Props) {
  const [company, setCompany] = useState(initialCompany);
  const [contact, setContact] = useState({ name: "", email: "", notes: "" });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  const jtbd = jtbdLabels(answers);

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = buildShareUrl(window.location.origin, company || "anon", answers);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      if (typeof window !== "undefined") {
        const ph = (window as unknown as { posthog?: { capture: (e: string, p?: Record<string, unknown>) => void } }).posthog;
        ph?.capture("quiz_share_copied", { state: result.state, slug: slugifyCompany(company || "anon") });
      }
    } catch {
      setCopied(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name || !contact.email) {
      setSubmitState({ status: "error", message: "Name and email are required." });
      return;
    }
    setSubmitState({ status: "sending" });
    try {
      const res = await fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: { ...contact, company },
          answers,
          result,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "Submit failed");
      setSubmitState({ status: "sent" });
      const ph = (window as unknown as { posthog?: { capture: (e: string, p?: Record<string, unknown>) => void } }).posthog;
      ph?.capture("quiz_lead_submitted", {
        state: result.state,
        engagement: result.recommendedEngagement.id,
      });
    } catch {
      setSubmitState({
        status: "error",
        message: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
        Your result
      </div>
      <h1 className="text-4xl sm:text-5xl font-black text-ink leading-[1.1] mb-4">
        {result.headline}
      </h1>
      <p className="text-lg text-ink-secondary max-w-xl mb-10">{result.diagnosis}</p>

      <Card className="p-8 mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
              Readiness
            </div>
            <div className="text-3xl font-black text-ink">
              {result.scores.readiness}
              <span className="text-ink-muted text-lg font-normal"> / 9</span>
            </div>
            <p className="text-sm text-ink-muted mt-2">
              Moment, clarity, and team combined.
            </p>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
              Urgency
            </div>
            <div className="text-3xl font-black text-ink">
              {result.scores.urgency}
              <span className="text-ink-muted text-lg font-normal"> / 6</span>
            </div>
            <p className="text-sm text-ink-muted mt-2">
              How loud the gap is, externally and internally.
            </p>
          </div>
        </div>
      </Card>

      {jtbd.length > 0 && (
        <section className="mb-10">
          <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
            {result.state === "ready"
              ? "What your build needs to do"
              : "What to nail before briefing"}
          </div>
          <ul className="space-y-2">
            {jtbd.map((label) => (
              <li
                key={label}
                className="border border-border-default p-3 text-sm text-ink"
              >
                {label}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
          Where we'd start
        </div>
        <Card className="p-6">
          <div className="font-semibold text-lg text-ink mb-1">
            {result.recommendedEngagement.label}
          </div>
          <p className="text-sm text-ink-muted">
            Based on where you are and what you said the site needs to do.
          </p>
        </Card>
      </section>

      <section className="mb-10">
        <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
          {result.state === "not_yet" ? "Stay in touch" : "Take the next step"}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Used in your shareable result link"
            />
          </div>
          <div>
            <Label htmlFor="notes">Anything we should know?</Label>
            <textarea
              id="notes"
              rows={3}
              className="w-full border border-border-default px-3 py-2 text-sm rounded-md"
              value={contact.notes}
              onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))}
            />
          </div>

          {submitState.status === "error" && (
            <Alert variant="destructive">{submitState.message}</Alert>
          )}
          {submitState.status === "sent" && (
            <Alert>Thanks — we&apos;ll be in touch shortly.</Alert>
          )}

          <Button type="submit" disabled={submitState.status === "sending"}>
            {submitState.status === "sending"
              ? "Sending…"
              : result.recommendedEngagement.cta}
          </Button>
        </form>
      </section>

      {showShareControls && (
        <section className="border-t border-border-default pt-8">
          <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
            Share this result
          </div>
          <p className="text-sm text-ink-muted mb-3">
            Add your company name and we&apos;ll make you a shareable link.
          </p>
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your company"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
              disabled={!company.trim()}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
