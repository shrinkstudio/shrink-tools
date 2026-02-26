"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Pulling your homepage...",
  "Checking signup flows...",
  "Looking for social proof...",
  "Evaluating pricing clarity...",
  "Scoring your CTAs...",
  "Crunching the numbers...",
];

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-32">
      <div className="max-w-sm mx-auto px-6 text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-10 h-10 border-[3px] border-border-default border-t-ink rounded-full animate-spin" />
        </div>

        <p className="text-sm text-ink mb-8 transition-opacity duration-300">
          {MESSAGES[messageIndex]}
        </p>

        <div className="flex justify-center gap-1.5">
          {MESSAGES.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                i === messageIndex ? "bg-ink" : "bg-border-strong"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
