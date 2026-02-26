"use client";

import { useState } from "react";
import posthog from "posthog-js";
import ScoreRing from "./ScoreRing";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
  tool?: string;
  scoreLabel?: string;
}

export default function EmailGate({
  result,
  analyzedUrl,
  onUnlock,
  reportId,
  tool = "plg",
  scoreLabel = "PLG Readiness Score",
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

    posthog.capture("email_submitted", {
      domain: analyzedUrl,
      email,
      opted_in_mailing: mailingList,
    });

    posthog.identify(email, {
      email,
      mailing_list: mailingList,
    });

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
        tool,
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
            {scoreLabel}
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

        <Card className="p-8">
          <CardHeader className="p-0 pb-8">
            <CardTitle>Your full report is ready.</CardTitle>
            <CardDescription>
              Drop your email to unlock the category breakdown, specific wins, and
              what to fix first.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs text-ink-secondary mb-1.5">
                  Work email
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <Label className="text-xs text-ink-secondary mb-1.5">
                  Company
                </Label>
                <Input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc"
                />
              </div>

              {/* GDPR consent */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="gdpr-consent"
                    checked={gdprConsent}
                    onCheckedChange={(checked) => {
                      setGdprConsent(checked === true);
                      if (checked) setGdprError("");
                    }}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="gdpr-consent"
                    className="text-xs text-ink-secondary leading-relaxed font-normal cursor-pointer"
                  >
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
                  </Label>
                </div>
                {gdprError && (
                  <p className="text-xs text-score-bad pl-6.5">{gdprError}</p>
                )}

                {/* Mailing list opt-in */}
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="mailing-list"
                    checked={mailingList}
                    onCheckedChange={(checked) => setMailingList(checked === true)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="mailing-list"
                    className="text-xs text-ink-secondary leading-relaxed font-normal cursor-pointer"
                  >
                    Send me occasional tips on PLG, web strategy, and what&apos;s
                    working for other companies.
                  </Label>
                </div>
              </div>

              <Button type="submit" size="lg" className="cursor-pointer w-full">
                Unlock Report &rarr;
              </Button>

              <p className="text-[0.65rem] text-ink-muted text-center">
                No spam. Unsubscribe anytime.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
