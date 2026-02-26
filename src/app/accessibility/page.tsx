"use client";

import { useState } from "react";
import posthog from "posthog-js";
import Header from "@/components/Header";
import HeroInput from "@/components/HeroInput";
import LoadingState from "@/components/LoadingState";
import EmailGate from "@/components/EmailGate";
import ResultsCard from "@/components/ResultsCard";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import StrengthsList from "@/components/StrengthsList";
import ImprovementsList from "@/components/ImprovementsList";
import Footer from "@/components/Footer";
import type { AnalysisResult, AppState, CategoryScore } from "@/lib/types";

const CATEGORIES = [
  "Colour & Contrast",
  "Images & Media",
  "Keyboard Nav",
  "Screen Reader",
  "Forms & Inputs",
  "Structure & Semantics",
  "Responsive & Adaptable",
];

const LOADING_MESSAGES = [
  "Scanning heading hierarchy...",
  "Checking image alt text...",
  "Testing keyboard navigation...",
  "Evaluating ARIA attributes...",
  "Reviewing form labels...",
  "Analysing colour contrast...",
];

function categoryScoreProps(categories: CategoryScore[]) {
  const map: Record<string, number> = {};
  for (const c of categories) {
    map[c.name.toLowerCase().replace(/[\s&]+/g, "_")] = c.score;
  }
  return map;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

export default function AccessibilityPage() {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzedUrl, setAnalyzedUrl] = useState("");
  const [error, setError] = useState("");

  const handleAnalyze = async (url: string) => {
    setState("loading");
    setError("");
    setAnalyzedUrl(url);
    posthog.capture("analysis_started", { domain: url, tool: "accessibility" });

    try {
      const response = await fetch("/api/analyze-accessibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data);

      if (getCookie("shrink-tools-unlocked")) {
        posthog.capture("analysis_completed", {
          domain: url,
          tool: "accessibility",
          score: data.overallScore,
          ...categoryScoreProps(data.categories),
        });
        setState("results");
      } else {
        setState("gated");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong on our end. Give it another go."
      );
      setState("idle");
    }
  };

  const handleUnlock = () => {
    posthog.capture("analysis_completed", {
      domain: analyzedUrl,
      tool: "accessibility",
      score: result!.overallScore,
      ...categoryScoreProps(result!.categories),
    });
    setState("results");
  };

  const handleAnalyzeAnother = () => {
    setState("idle");
    setResult(null);
    setAnalyzedUrl("");
    setError("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {state === "idle" && (
          <div className="animate-fade-in">
            <HeroInput
              onAnalyze={handleAnalyze}
              isLoading={false}
              title={
                <>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink leading-[1.1] mb-2">
                    Is your website actually
                  </h1>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink-muted leading-[1.1] mb-6">
                    accessible to everyone?
                  </h1>
                </>
              }
              subtitle="Most websites fail basic accessibility checks — missing alt text, broken keyboard nav, poor contrast. See where yours stands in 30 seconds."
              categories={CATEGORIES}
            />
            {error && (
              <div className="max-w-md mx-auto px-6 -mt-16 mb-10">
                <div className="border border-score-bad/20 bg-score-bad/5 text-score-bad px-4 py-3 rounded-lg text-sm text-center">
                  {error}
                </div>
              </div>
            )}
          </div>
        )}

        {state === "loading" && (
          <div className="animate-fade-in">
            <LoadingState messages={LOADING_MESSAGES} />
          </div>
        )}

        {state === "gated" && result && (
          <div className="animate-fade-in">
            <EmailGate
              result={result}
              analyzedUrl={analyzedUrl}
              onUnlock={handleUnlock}
              reportId={result.reportId ?? null}
              tool="accessibility"
              scoreLabel="Accessibility Score"
            />
          </div>
        )}

        {state === "results" && result && (
          <div className="animate-fade-in">
            <ResultsCard
              result={result}
              analyzedUrl={analyzedUrl}
              onAnalyzeAnother={handleAnalyzeAnother}
              scoreLabel="Accessibility Score"
            />
            <div className="max-w-2xl mx-auto px-6">
              <hr className="border-border-default" />
            </div>
            <CategoryBreakdown categories={result.categories} />
            <div className="max-w-2xl mx-auto px-6">
              <hr className="border-border-default" />
            </div>
            <StrengthsList strengths={result.strengths} />
            <div className="max-w-2xl mx-auto px-6">
              <hr className="border-border-default" />
            </div>
            <ImprovementsList improvements={result.improvements} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
