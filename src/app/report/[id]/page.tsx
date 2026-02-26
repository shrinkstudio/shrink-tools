import { notFound, redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

async function getReport(id: string) {
  const { data: report } = await supabase
    .from("reports")
    .select("id, slug")
    .eq("id", id)
    .single();

  return report;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    notFound();
  }

  if (report.slug) {
    redirect(`/${report.slug}`);
  }

  // Old reports without slugs — redirect to home
  notFound();
}
