import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PLG Readiness Analyser | Shrink Studio | Webflow Premium Partner",
  description:
    "Find out if your website is actually built for product-led growth. Free AI-powered analysis across 7 categories. Takes 30 seconds.",
};

export default function PLGLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
