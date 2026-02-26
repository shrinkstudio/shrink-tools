import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface LeadPayload {
  email: string;
  company: string;
  url: string;
  overallScore: number;
  gdprConsent: boolean;
  mailingListOptIn: boolean;
  tool: string;
  timestamp: string;
  reportId: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadPayload = await request.json();

    if (!body.email || !EMAIL_REGEX.test(body.email)) {
      return NextResponse.json(
        { success: false, error: "Valid email is required." },
        { status: 400 }
      );
    }

    if (!body.gdprConsent) {
      return NextResponse.json(
        { success: false, error: "GDPR consent is required." },
        { status: 400 }
      );
    }

    const clickupApiKey = process.env.CLICKUP_API_KEY;
    if (!clickupApiKey) {
      console.error("CLICKUP_API_KEY is not set");
      return NextResponse.json({ success: true });
    }

    const lines = [
      "Lead from Shrink Tools",
      "",
      `Email: ${body.email}`,
      `Company: ${body.company || "Not provided"}`,
      `URL analysed: ${body.url}`,
      `Tool: ${body.tool}`,
      `Overall score: ${body.overallScore}/100`,
      `GDPR consent: Yes`,
      `Mailing list opt-in: ${body.mailingListOptIn ? "Yes" : "No"}`,
      `Captured: ${formatDate(body.timestamp)}`,
    ];

    if (body.reportId) {
      let reportUrl = `https://tools.shrink.studio/report/${body.reportId}`;
      try {
        const { data: report } = await supabase
          .from("reports")
          .select("slug")
          .eq("id", body.reportId)
          .single();
        if (report?.slug) {
          reportUrl = `https://tools.shrink.studio/${report.slug}`;
        }
      } catch {
        // fall back to UUID URL
      }
      lines.push("");
      lines.push(`Report: ${reportUrl}`);
    }

    const taskBody = {
      name: `${body.company || "Unknown"} - ${body.email}`,
      description: lines.join("\n"),
      status: "lead in",
      tags: [body.tool || "plg"],
    };

    try {
      const response = await fetch(
        "https://api.clickup.com/api/v2/list/901216009134/task",
        {
          method: "POST",
          headers: {
            Authorization: clickupApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(taskBody),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ClickUp API error:", response.status, errorText);
        return NextResponse.json({ success: true });
      }

      const data = await response.json();
      return NextResponse.json({ success: true, taskId: data.id });
    } catch (clickupError) {
      console.error("ClickUp API request failed:", clickupError);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Leads endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to save your details. Your report is still available.",
      },
      { status: 500 }
    );
  }
}
