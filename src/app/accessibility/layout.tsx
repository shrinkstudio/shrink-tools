import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Checker | Shrink Studio",
  description:
    "See how inclusive your website really is. Free AI-powered accessibility audit across 7 WCAG categories. Takes 30 seconds.",
};

export default function AccessibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
