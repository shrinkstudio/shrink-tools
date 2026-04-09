import { NextRequest, NextResponse } from "next/server";

const CLICKUP_LIST_ID = "901216561772";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Contact = { name?: string; email?: string; company?: string; notes?: string };
type Selection = {
  type?: string;
  discoveryTier?: string;
  seats?: number;
  devSubtype?: string;
  devItems?: string[];
  optTier?: string;
  addons?: string[];
};
type Result =
  | { mode: "range"; low: number; high: number }
  | { mode: "single"; value: number; recurring?: boolean }
  | { mode: "enquiry" };

const fmtGBP = (n: number | undefined) =>
  typeof n === "number" ? "£" + Math.round(n).toLocaleString("en-GB") : "—";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      contact?: Contact;
      selection?: Selection;
      result?: Result;
    };
    const contact = body.contact || {};
    const selection = body.selection || {};
    const result = body.result || ({ mode: "enquiry" } as Result);

    if (!contact.name || !contact.email || !EMAIL_REGEX.test(contact.email)) {
      return NextResponse.json(
        { success: false, error: "Name and valid email are required." },
        { status: 400 }
      );
    }

    const clickupApiKey = process.env.CLICKUP_API_KEY;
    if (!clickupApiKey) {
      console.error("CLICKUP_API_KEY is not set");
      return NextResponse.json(
        { success: false, error: "Server configuration error." },
        { status: 500 }
      );
    }

    const lines = [
      "## Project Estimator Enquiry",
      "",
      `**Name:** ${contact.name}`,
      `**Company:** ${contact.company || "Not provided"}`,
      `**Email:** ${contact.email}`,
      `**Service type:** ${selection.type || "—"}`,
    ];

    if (selection.type === "discovery") {
      lines.push(`**Discovery tier:** ${selection.discoveryTier || "—"}`);
      if (selection.discoveryTier === "workshop") {
        lines.push(`**Seats:** ${selection.seats ?? "—"}`);
      }
    }
    if (selection.type === "development") {
      lines.push(`**Dev subtype:** ${selection.devSubtype || "—"}`);
      lines.push(`**Items:** ${(selection.devItems || []).join(", ") || "—"}`);
    }
    if (selection.type === "optimisation") {
      lines.push(`**Tier:** ${selection.optTier || "—"}`);
    }
    lines.push(`**Add-ons:** ${(selection.addons || []).join(", ") || "—"}`);

    lines.push("", "## Result", "");
    if (result.mode === "range") {
      lines.push(`**Estimated range:** ${fmtGBP(result.low)} – ${fmtGBP(result.high)}`);
    } else if (result.mode === "single") {
      lines.push(
        `**Estimated price:** ${fmtGBP(result.value)}${result.recurring ? "/mo" : ""}`
      );
    } else {
      lines.push("**Needs scoping call** (no number produced)");
    }

    if (contact.notes) lines.push("", `**Notes:** ${contact.notes}`);

    const taskBody = {
      name: `${contact.company || contact.name} — Estimator (${selection.type || "enquiry"})`,
      markdown_description: lines.join("\n"),
    };

    const response = await fetch(
      `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task`,
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
      return NextResponse.json(
        { success: false, error: "Failed to submit enquiry." },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, taskId: data.id });
  } catch (error) {
    console.error("Estimator submit error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
