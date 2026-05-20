import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ready to brief a build? | Shrink Studio",
  description:
    "Seven questions on stage, audience, and what comes next. We'll tell you what the build needs to do — and whether now's the moment.",
};

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
