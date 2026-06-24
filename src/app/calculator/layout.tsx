import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Calculator | Shrink Studio",
  description:
    "Answer a few plain questions and get a genuine ballpark for your website or product build — priced against the same rate card Shrink uses internally.",
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
