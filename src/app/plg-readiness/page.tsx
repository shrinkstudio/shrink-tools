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
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import type { AnalysisResult, AppState, CategoryScore } from "@/lib/types";

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

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzedUrl, setAnalyzedUrl] = useState("");
  const [error, setError] = useState("");

  const handleAnalyze = async (url: string) => {
    setState("loading");
    setError("");
    setAnalyzedUrl(url);
    posthog.capture("analysis_started", { domain: url });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data);

      // Skip the email gate if they've already unlocked before
      if (getCookie("shrink-tools-unlocked")) {
        posthog.capture("analysis_completed", {
          domain: url,
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
            <HeroInput onAnalyze={handleAnalyze} isLoading={false} />
            {error && (
              <div className="max-w-md mx-auto px-6 -mt-16 mb-10">
                <Alert variant="destructive">{error}</Alert>
              </div>
            )}
          </div>
        )}

        {state === "loading" && (
          <div className="animate-fade-in">
            <LoadingState />
          </div>
        )}

        {state === "gated" && result && (
          <div className="animate-fade-in">
            <EmailGate
              result={result}
              analyzedUrl={analyzedUrl}
              onUnlock={handleUnlock}
              reportId={result.reportId ?? null}
            />
          </div>
        )}

        {state === "results" && result && (
          <div className="animate-fade-in">
            <ResultsCard
              result={result}
              analyzedUrl={analyzedUrl}
              onAnalyzeAnother={handleAnalyzeAnother}
            />
            <div className="max-w-2xl mx-auto px-6">
              <Separator />
            </div>
            <CategoryBreakdown categories={result.categories} />
            <div className="max-w-2xl mx-auto px-6">
              <Separator />
            </div>
            <StrengthsList strengths={result.strengths} />
            <div className="max-w-2xl mx-auto px-6">
              <Separator />
            </div>
            <ImprovementsList improvements={result.improvements} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
