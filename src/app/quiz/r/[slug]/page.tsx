import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ResultView from "@/components/quiz/ResultView";
import { decodeAnswers } from "@/lib/quiz/slug";
import { computeResult } from "@/lib/quiz/scoring";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
};

function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = prettifySlug(slug);
  return {
    title: `${name} — Ready to brief a build? | Shrink Studio`,
    description:
      "Result from Shrink Studio's readiness quiz. Find out where you are on the brief-a-build journey.",
  };
}

export default async function SharedResultPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { d } = await searchParams;
  const answers = d ? decodeAnswers(d) : null;
  const result = answers ? computeResult(answers) : null;
  const companyName = prettifySlug(slug);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-16">
          {result && answers ? (
            <>
              <div className="text-xs font-mono uppercase tracking-[0.1em] text-ink-muted mb-3">
                {companyName}
              </div>
              <ResultView
                answers={answers}
                result={result}
                initialCompany={companyName}
                showShareControls={false}
              />
            </>
          ) : (
            <div className="animate-fade-in">
              <h1 className="text-4xl font-black text-ink mb-3">This link looks empty.</h1>
              <p className="text-lg text-ink-muted mb-8 max-w-xl">
                We couldn&apos;t read the result data in this URL. Take the quiz yourself and share
                your result.
              </p>
              <Button asChild>
                <a href="/quiz">Take the quiz</a>
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
