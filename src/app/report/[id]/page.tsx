import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/Header";
import ResultsCard from "@/components/ResultsCard";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import StrengthsList from "@/components/StrengthsList";
import ImprovementsList from "@/components/ImprovementsList";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import type { AnalysisResult } from "@/lib/types";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

async function getReport(id: string) {
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  return report;
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    return { title: "Report not found | Shrink Studio" };
  }

  const title = `PLG Report: ${report.site_name} - ${report.overall_score}/100 | Shrink Studio`;
  const description = report.summary as string;

  return {
    title,
    description,
    openGraph: {
      title: `PLG Readiness: ${report.site_name} scored ${report.overall_score}/100`,
      description,
    },
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    notFound();
  }

  const result: AnalysisResult = {
    overallScore: report.overall_score as number,
    summary: report.summary as string,
    categories: report.categories as AnalysisResult["categories"],
    strengths: report.strengths as AnalysisResult["strengths"],
    improvements: report.improvements as AnalysisResult["improvements"],
    reportId: report.id as string,
  };

  const analyzedUrl = report.url as string;

  const createdAt = new Date(report.created_at as string);
  const formattedDate = createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 animate-fade-in">
        {/* Date line */}
        <div className="max-w-2xl mx-auto px-6 pt-12 text-center">
          <p className="text-sm text-ink-muted">Generated on {formattedDate}</p>
        </div>

        <ResultsCard
          result={result}
          analyzedUrl={analyzedUrl}
          onAnalyzeAnother={null}
        />
        <div className="max-w-2xl mx-auto px-6">
          <hr className="border-border-default" />
        </div>
        <CategoryBreakdown categories={result.categories} />
        <div className="max-w-2xl mx-auto px-6">
          <hr className="border-border-default" />
        </div>
        <StrengthsList strengths={result.strengths} />
        <div className="max-w-2xl mx-auto px-6">
          <hr className="border-border-default" />
        </div>
        <ImprovementsList improvements={result.improvements} />
        <div className="max-w-2xl mx-auto px-6">
          <hr className="border-border-default" />
        </div>

        {/* CTA section */}
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-black text-ink mb-3">
              Want help fixing this?
            </h2>
            <p className="text-sm text-ink-secondary mb-8 max-w-md mx-auto">
              We build high-performance websites for ambitious companies.
            </p>
            <div className="flex justify-center gap-3">
              <a
                href="https://cal.com/shrinkstudio/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-ink text-white rounded-lg border border-transparent font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] transition-opacity duration-300 ease-in-out hover:opacity-50 text-center"
              >
                Talk to us
              </a>
              <a
                href="https://tools.shrink.studio"
                className="px-5 py-2.5 border border-border-strong text-ink rounded-lg font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] transition-opacity duration-300 ease-in-out hover:opacity-50 text-center"
              >
                Run your own analysis
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
