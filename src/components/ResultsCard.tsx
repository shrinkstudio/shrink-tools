"use client";

import posthog from "posthog-js";
import ScoreRing from "./ScoreRing";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/types";

interface ResultsCardProps {
  result: AnalysisResult;
  analyzedUrl: string;
  onAnalyzeAnother?: (() => void) | null;
  scoreLabel?: string;
}

export default function ResultsCard({
  result,
  analyzedUrl,
  onAnalyzeAnother,
  scoreLabel = "PLG Readiness Score",
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
            {scoreLabel}
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
          <Button asChild>
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
            >
              Talk to us
            </a>
          </Button>
          {onAnalyzeAnother && (
            <Button
              variant="outline"
              onClick={onAnalyzeAnother}
              className="cursor-pointer"
            >
              Analyse another site
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
