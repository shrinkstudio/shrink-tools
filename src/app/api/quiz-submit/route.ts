import { NextRequest, NextResponse } from "next/server";
import { QUESTIONS, type Answers } from "@/lib/quiz/schema";
import type { QuizResult } from "@/lib/quiz/scoring";

const CLICKUP_LIST_ID = "901216561772";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Contact = { name?: string; email?: string; company?: string; notes?: string };

type Body = {
  contact?: Contact;
  answers?: Answers;
  result?: QuizResult;
};

function labelFor(questionId: string, optionId: string): string {
  const q = QUESTIONS.find((q) => q.id === questionId);
  if (!q) return optionId;
  return q.options.find((o) => o.id === optionId)?.label ?? optionId;
}

function formatAnswers(answers: Answers): string[] {
  const lines: string[] = [];
  for (const q of QUESTIONS) {
    const ans = answers[q.id];
    let value: string;
    if (Array.isArray(ans)) {
      value = ans.map((id) => labelFor(q.id, id)).join(", ") || "—";
    } else if (typeof ans === "string") {
      value = labelFor(q.id, ans);
    } else {
      value = "—";
    }
    lines.push(`**${q.prompt}**`, value, "");
  }
  return lines;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const contact = body.contact || {};
    const answers = body.answers || {};
    const result = body.result;

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

    const stateLabel =
      result?.state === "ready"
        ? "Ready to brief a build"
        : result?.state === "close"
          ? "Close — brief not there yet"
          : result?.state === "not_yet"
            ? "Not the moment yet"
            : "Unknown";

    const lines = [
      "## Ready-to-brief Quiz Result",
      "",
      `**Name:** ${contact.name}`,
      `**Company:** ${contact.company || "Not provided"}`,
      `**Email:** ${contact.email}`,
      "",
      `**State:** ${stateLabel}`,
      `**Recommended engagement:** ${result?.recommendedEngagement.label ?? "—"}`,
      `**Readiness:** ${result?.scores.readiness ?? "—"} / 9`,
      `**Urgency:** ${result?.scores.urgency ?? "—"} / 6`,
      "",
      "## Answers",
      "",
      ...formatAnswers(answers),
    ];

    if (contact.notes) lines.push(`**Notes:** ${contact.notes}`);

    const taskBody = {
      name: `${contact.company || contact.name} — Quiz (${stateLabel})`,
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
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
