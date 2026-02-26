"use client";

import { useEffect, useState } from "react";

const DEFAULT_MESSAGES = [
  "Pulling your homepage...",
  "Checking signup flows...",
  "Looking for social proof...",
  "Evaluating pricing clarity...",
  "Scoring your CTAs...",
  "Crunching the numbers...",
];

interface LoadingStateProps {
  messages?: string[];
}

export default function LoadingState({
  messages = DEFAULT_MESSAGES,
}: LoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <section className="py-32">
      <div className="max-w-sm mx-auto px-6 text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-10 h-10 border-[3px] border-border-default border-t-ink rounded-full animate-spin" />
        </div>

        <p className="text-sm text-ink mb-8 transition-opacity duration-300">
          {messages[messageIndex]}
        </p>

        <div className="flex justify-center gap-1.5">
          {messages.map((_, i) => (
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
