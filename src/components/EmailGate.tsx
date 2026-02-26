"use client";

import { useState } from "react";
import ScoreRing from "./ScoreRing";
import type { AnalysisResult } from "@/lib/types";

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

interface EmailGateProps {
  result: AnalysisResult;
  analyzedUrl: string;
  onUnlock: () => void;
  reportId: string | null;
}

export default function EmailGate({
  result,
  analyzedUrl,
  onUnlock,
  reportId,
}: EmailGateProps) {
  let domain = analyzedUrl;
  try {
    domain = new URL(
      analyzedUrl.startsWith("http") ? analyzedUrl : `https://${analyzedUrl}`
    ).hostname;
  } catch {
    // keep raw URL as fallback
  }

  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [mailingList, setMailingList] = useState(false);
  const [gdprError, setGdprError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gdprConsent) {
      setGdprError(
        "You'll need to tick this one - we can't send your report without it."
      );
      return;
    }
    setGdprError("");

    // Fire-and-forget: send lead to ClickUp, don't block the user
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        company,
        url: analyzedUrl,
        overallScore: result.overallScore,
        gdprConsent: true,
        mailingListOptIn: mailingList,
        tool: "plg",
        timestamp: new Date().toISOString(),
        reportId,
      }),
    }).catch((err) => {
      console.error("Failed to send lead:", err);
    });

    // Set cookie so they skip the gate next time
    setCookie("shrink-tools-unlocked", "true", 30);

    // Immediately unlock
    onUnlock();
  };

  return (
    <section className="py-20">
      <div className="max-w-lg mx-auto px-6">
        <div className="flex flex-col items-center mb-12">
          <p className="font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] text-ink-muted mb-6">
            PLG Readiness Score
          </p>
          <ScoreRing
            score={result.overallScore}
            size={140}
            strokeWidth={8}
            fontSize="text-4xl"
          />
          <div className="mt-4 flex items-center justify-center gap-2">
            <p className="text-lg font-black text-ink">{domain}</p>
            <a
              href={analyzedUrl.startsWith("http") ? analyzedUrl : `https://${analyzedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-muted hover:text-ink transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="bg-white border border-border-default rounded-lg p-8">
          <h2 className="text-xl font-black text-ink mb-2">
            Your full report is ready.
          </h2>
          <p className="text-sm text-ink-secondary mb-8">
            Drop your email to unlock the category breakdown, specific wins, and
            what to fix first.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-ink-secondary mb-1.5">
                Work email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 border border-border-strong rounded-lg text-sm text-ink bg-white placeholder:text-ink-muted focus:outline-none focus:border-ink transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-secondary mb-1.5">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc"
                className="w-full px-3.5 py-2.5 border border-border-strong rounded-lg text-sm text-ink bg-white placeholder:text-ink-muted focus:outline-none focus:border-ink transition-colors"
              />
            </div>

            {/* GDPR consent */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={(e) => {
                    setGdprConsent(e.target.checked);
                    if (e.target.checked) setGdprError("");
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-border-strong accent-ink flex-shrink-0"
                />
                <span className="text-xs text-ink-secondary leading-relaxed">
                  I agree to Shrink Studio{" "}
                  <a
                    href="https://shrink.studio/legals/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-ink transition-colors"
                  >
                    storing my details
                  </a>{" "}
                  and contacting me about my results.
                </span>
              </label>
              {gdprError && (
                <p className="text-xs text-score-bad pl-6.5">{gdprError}</p>
              )}

              {/* Mailing list opt-in */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mailingList}
                  onChange={(e) => setMailingList(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-strong accent-ink flex-shrink-0"
                />
                <span className="text-xs text-ink-secondary leading-relaxed">
                  Send me occasional tips on PLG, web strategy, and what&apos;s
                  working for other companies.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full bg-ink text-white uppercase tracking-[0.1em] font-mono text-[0.75rem] leading-[1.5] font-medium py-3 rounded-lg border border-transparent transition-opacity duration-300 ease-in-out hover:opacity-50"
            >
              Unlock Report &rarr;
            </button>

            <p className="text-[0.65rem] text-ink-muted text-center">
              No spam. Unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
