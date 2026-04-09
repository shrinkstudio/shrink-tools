import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Estimator | Shrink Studio",
  description:
    "Get a ballpark cost for your next website, web app, or optimisation retainer — built from our real rate card. No sales call required.",
};

export default function ProjectEstimatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
