"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "https://eu.i.posthog.com",
      persistence: "localStorage+cookie",
      capture_pageview: true,
      capture_pageleave: true,
    });

    // Start opted out — only track after cookie consent
    posthog.opt_out_capturing();

    // Listen for CookieYes consent
    document.addEventListener("cookieyes_consent_update", ((event: CustomEvent) => {
      const consent = event.detail;
      if (consent.accepted.includes("analytics")) {
        posthog.opt_in_capturing();
      }
    }) as EventListener);

    // Check if already consented (returning visitor)
    const existingConsent = (window as unknown as { getCkyConsent?: () => { categories?: { analytics?: boolean } } }).getCkyConsent?.();
    if (existingConsent?.categories?.analytics) {
      posthog.opt_in_capturing();
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
