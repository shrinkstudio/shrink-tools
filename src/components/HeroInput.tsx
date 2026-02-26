"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DEFAULT_CATEGORIES = [
  "Value Prop",
  "Self-Service",
  "Onboarding",
  "Social Proof",
  "CTA Clarity",
  "Visibility",
  "Pricing",
];

interface HeroInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  title?: React.ReactNode;
  subtitle?: string;
  placeholder?: string;
  categories?: string[];
  stats?: string[];
}

export default function HeroInput({
  onAnalyze,
  isLoading,
  title,
  subtitle,
  placeholder = "Enter a URL - e.g. stripe.com",
  categories = DEFAULT_CATEGORIES,
  stats = ["7 Categories", "1 Page", "AI-Powered"],
}: HeroInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyze(url.trim());
    }
  };

  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <p className="font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] text-ink-muted mb-4">
          Free Tool
        </p>
        {title ? (
          title
        ) : (
          <>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink leading-[1.1] mb-2">
              Is your website actually
            </h1>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink-muted leading-[1.1] mb-6">
              built for growth?
            </h1>
          </>
        )}
        <p className="text-base text-ink-secondary max-w-md mx-auto mb-10">
          {subtitle ??
            "Most SaaS websites look the part but fumble the basics - buried signups, vague pricing, zero social proof. Find out where yours stands in 30 seconds."}
        </p>

        <form
          onSubmit={handleSubmit}
          className="relative max-w-md mx-auto mb-6"
        >
          <Input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-4 pr-32 py-3.5"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="cursor-pointer absolute right-1.5 top-1.5 bottom-1.5 h-auto rounded-md px-4"
          >
            Analyse &rarr;
          </Button>
        </form>

        {/* Stat tags */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
          {stats.map((stat) => (
            <Badge key={stat} variant="outline">
              {stat}
            </Badge>
          ))}
        </div>

        {/* Category pills */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap mb-6">
          {categories.map((cat) => (
            <Badge key={cat} variant="secondary">
              {cat}
            </Badge>
          ))}
        </div>

      </div>
    </section>
  );
}
