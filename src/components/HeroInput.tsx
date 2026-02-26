"use client";

import { useState } from "react";

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
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-4 pr-32 py-3.5 border border-border-strong rounded-lg text-ink bg-white placeholder:text-ink-muted focus:outline-none focus:border-ink transition-colors text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="cursor-pointer absolute right-1.5 top-1.5 bottom-1.5 bg-ink text-white uppercase tracking-[0.1em] font-mono text-[0.75rem] leading-[1.5] font-medium px-4 rounded-md border border-transparent transition-opacity duration-300 ease-in-out hover:opacity-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Analyse &rarr;
          </button>
        </form>

        {/* Stat tags */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
          {stats.map((stat) => (
            <span
              key={stat}
              className="font-mono text-[0.65rem] leading-[1.5] uppercase tracking-[0.1em] text-ink-muted border border-border-default rounded px-2 py-0.5"
            >
              {stat}
            </span>
          ))}
        </div>

        {/* Category pills */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap mb-6">
          {categories.map((cat) => (
            <span
              key={cat}
              className="text-[0.65rem] text-ink-secondary bg-surface rounded-full px-2.5 py-0.5"
            >
              {cat}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}
