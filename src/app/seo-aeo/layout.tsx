import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEO & AEO Visibility Checker | Shrink Studio",
  description:
    "Your site needs to rank on Google AND show up in AI answers. Free AI-powered audit across 7 SEO and AEO categories. Takes 30 seconds.",
};

export default function SeoAeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
