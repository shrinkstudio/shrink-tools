import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabase } from "@/lib/supabase";
import { ReportDocument } from "@/lib/pdf/ReportDocument";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const toolLabels: Record<string, string> = {
    plg: "PLG Readiness",
    accessibility: "Accessibility",
    structure: "Structure & Scaffolding",
    "seo-aeo": "SEO & AEO Visibility",
  };

  const buffer = await renderToBuffer(
    <ReportDocument
      siteName={report.site_name as string}
      url={report.url as string}
      tool={toolLabels[(report.tool as string) ?? "plg"] ?? "Assessment"}
      overallScore={report.overall_score as number}
      summary={report.summary as string}
      categories={report.categories as { name: string; score: number; description: string }[]}
      strengths={report.strengths as { title: string; impact: string; description: string }[]}
      improvements={
        report.improvements as {
          title: string;
          priority: string;
          description: string;
          recommendation: string;
        }[]
      }
      createdAt={report.created_at as string}
      reportUrl={`https://tools.shrink.studio/${slug}`}
    />
  );

  const filename = `${slug}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
