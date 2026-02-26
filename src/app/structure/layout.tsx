import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Structure & Scaffolding Checker | Shrink Studio",
  description:
    "Audit your site's information architecture  - from navigation depth to internal linking  - and see if your structure helps or hurts discovery. Free AI-powered analysis. Takes 30 seconds.",
};

export default function StructureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
