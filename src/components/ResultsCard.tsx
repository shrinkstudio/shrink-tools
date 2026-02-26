"use client";

import posthog from "posthog-js";
import ScoreRing from "./ScoreRing";
import type { AnalysisResult } from "@/lib/types";

interface ResultsCardProps {
  result: AnalysisResult;
  analyzedUrl: string;
  onAnalyzeAnother?: (() => void) | null;
}

export default function ResultsCard({
  result,
  analyzedUrl,
  onAnalyzeAnother,
}: ResultsCardProps) {
  let domain = analyzedUrl;
  try {
    domain = new URL(
      analyzedUrl.startsWith("http") ? analyzedUrl : `https://${analyzedUrl}`
    ).hostname;
  } catch {
    // keep raw URL as fallback
  }

  const fullUrl = analyzedUrl.startsWith("http")
    ? analyzedUrl
    : `https://${analyzedUrl}`;

  return (
    <section className="pt-16 pb-8">
      <div className="max-w-2xl mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-8">
          <p className="font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] text-ink-muted mb-6">
            PLG Readiness Score
          </p>
          <ScoreRing
            score={result.overallScore}
            size={120}
            strokeWidth={8}
            fontSize="text-3xl"
          />
          <div className="mt-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-xl font-black text-ink">{domain}</h2>
              <a
                href={fullUrl}
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
            <p className="text-sm text-ink-secondary max-w-md">
              {result.summary}
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <a
            href="https://cal.com/shrinkstudio/30min"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              posthog.capture("cta_clicked", {
                domain: analyzedUrl,
                score: result.overallScore,
                cta: "talk_to_us",
              })
            }
            className="px-5 py-2.5 bg-ink text-white rounded-lg border border-transparent font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] transition-opacity duration-300 ease-in-out hover:opacity-50 text-center"
          >
            Talk to us
          </a>
          {onAnalyzeAnother && (
            <button
              onClick={onAnalyzeAnother}
              className="cursor-pointer px-5 py-2.5 border border-border-strong text-ink rounded-lg font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] transition-opacity duration-300 ease-in-out hover:opacity-50"
            >
              Analyse another site
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
