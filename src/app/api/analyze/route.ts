import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are an expert Product-Led Growth (PLG) analyst. Analyze the provided website content and return a JSON response scoring the site across 7 PLG categories on how well it implements product-led growth principles.

Score each category 0-100 based on how effectively the website:
- Communicates value without requiring sales interaction
- Enables self-service signup and exploration
- Demonstrates the product before commitment
- Builds trust through social proof and transparency
- Guides users toward activation with clear CTAs

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence overview of the site's PLG effectiveness>",
  "categories": [
    {
      "name": "Value Prop",
      "score": <number 0-100>,
      "description": "<brief assessment of value proposition clarity>"
    },
    {
      "name": "Self-Service",
      "score": <number 0-100>,
      "description": "<brief assessment of self-service signup path>"
    },
    {
      "name": "Onboarding",
      "score": <number 0-100>,
      "description": "<brief assessment of signup/onboarding experience>"
    },
    {
      "name": "Social Proof",
      "score": <number 0-100>,
      "description": "<brief assessment of social proof and trust signals>"
    },
    {
      "name": "CTA Clarity",
      "score": <number 0-100>,
      "description": "<brief assessment of call-to-action effectiveness>"
    },
    {
      "name": "Visibility",
      "score": <number 0-100>,
      "description": "<brief assessment of product visibility before signup>"
    },
    {
      "name": "Pricing",
      "score": <number 0-100>,
      "description": "<brief assessment of pricing transparency>"
    }
  ],
  "strengths": [
    {
      "title": "<strength title>",
      "impact": "HIGH" | "MEDIUM",
      "description": "<detailed explanation of what they're doing well, referencing specific content from the website>"
    }
  ],
  "improvements": [
    {
      "title": "<improvement title>",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "description": "<what the issue is, referencing specific observations>",
      "recommendation": "<specific actionable recommendation>"
    }
  ]
}

Write like you're giving honest feedback to a founder over coffee. Short sentences. No filler.

Be specific and reference actual content from the website. Provide 3-4 strengths and 3-4 improvements. Return improvements sorted by priority — most impactful first. Be honest. If something is genuinely blocking growth, mark it HIGH.

Scores should be realistic and varied — don't give everything 80-90. A site with no free trial or self-service signup should score low on Self-Service. A site with no product screenshots should score low on Visibility.`;

function extractContent(html: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  return {
    title: $("title").text().trim(),
    metaDescription: $('meta[name="description"]').attr("content") || "",
    headings: $("h1, h2, h3, h4, h5, h6")
      .map((_, el) => ({
        tag: (el as unknown as { tagName: string }).tagName,
        text: $(el).text().trim(),
      }))
      .get()
      .filter((h) => h.text),
    paragraphs: $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .slice(0, 50),
    links: $("a")
      .map((_, el) => ({
        text: $(el).text().trim(),
        href: $(el).attr("href") || "",
      }))
      .get()
      .filter((l) => l.text)
      .slice(0, 100),
    buttons: $(
      'button, [role="button"], a[class*="btn"], a[class*="button"], a[class*="cta"]'
    )
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean),
    images: $("img")
      .map((_, el) => ({
        alt: $(el).attr("alt") || "",
        src: $(el).attr("src") || "",
      }))
      .get()
      .slice(0, 30),
    forms: $("form").length,
    signupSignals: $("a, button")
      .filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return (
          text.includes("sign up") ||
          text.includes("signup") ||
          text.includes("get started") ||
          text.includes("free trial") ||
          text.includes("start free") ||
          text.includes("try free") ||
          text.includes("create account") ||
          text.includes("register")
        );
      })
      .map((_, el) => $(el).text().trim())
      .get(),
    loginSignals: $("a, button")
      .filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return (
          text.includes("log in") ||
          text.includes("login") ||
          text.includes("sign in") ||
          text.includes("signin")
        );
      })
      .map((_, el) => $(el).text().trim())
      .get(),
    pricingLinks: $("a")
      .filter((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().toLowerCase();
        return href.includes("pricing") || text.includes("pricing");
      })
      .map((_, el) => $(el).text().trim())
      .get(),
    demoSignals: $("a, button")
      .filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return (
          text.includes("demo") ||
          text.includes("book a demo") ||
          text.includes("request demo") ||
          text.includes("watch demo")
        );
      })
      .map((_, el) => $(el).text().trim())
      .get(),
  };
}

function generateSlug(siteName: string, tool: string): string {
  const domain = siteName
    .replace(/^www\./, "")
    .replace(/\./g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();

  const toolSlugs: Record<string, string> = {
    plg: "plg-assessment",
    accessibility: "accessibility-assessment",
  };

  return `${domain}-${toolSlugs[tool] || `${tool}-assessment`}`;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    // Validate and normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: "That doesn't look like a URL. Try something like stripe.com" },
        { status: 400 }
      );
    }

    // Fetch the website HTML
    let html: string;
    try {
      const response = await fetch(normalizedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(15000),
      });
      html = await response.text();
    } catch {
      return NextResponse.json(
        {
          error:
            "Couldn't reach that site. Check the URL and try again.",
        },
        { status: 400 }
      );
    }

    // Try to fetch pricing page
    let pricingHtml = "";
    try {
      const pricingUrl = new URL("/pricing", normalizedUrl);
      const pricingResponse = await fetch(pricingUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (pricingResponse.ok) {
        pricingHtml = await pricingResponse.text();
      }
    } catch {
      // Pricing page not available
    }

    // Parse HTML with Cheerio
    const extracted = extractContent(html);

    // Parse pricing page if available
    let pricingContent = "";
    if (pricingHtml) {
      const $pricing = cheerio.load(pricingHtml);
      $pricing("script, style, noscript, svg").remove();
      pricingContent = $pricing(
        'main, [role="main"], .pricing, #pricing, body'
      )
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000);
    }

    // Build prompt content
    const websiteContent = `Website URL: ${normalizedUrl}
Title: ${extracted.title}
Meta Description: ${extracted.metaDescription}

Headings:
${extracted.headings.map((h) => `${h.tag}: ${h.text}`).join("\n")}

Key Content (paragraphs):
${extracted.paragraphs.slice(0, 30).join("\n")}

Navigation/Links:
${extracted.links
  .slice(0, 50)
  .map((l) => `${l.text} → ${l.href}`)
  .join("\n")}

CTAs/Buttons:
${extracted.buttons.join(", ")}

Signup Signals: ${extracted.signupSignals.join(", ") || "None found"}
Login Signals: ${extracted.loginSignals.join(", ") || "None found"}
Pricing Links: ${extracted.pricingLinks.join(", ") || "None found"}
Demo Signals: ${extracted.demoSignals.join(", ") || "None found"}
Forms Found: ${extracted.forms}
Images: ${extracted.images
      .map((i) => i.alt)
      .filter(Boolean)
      .join(", ")}

${pricingContent ? `Pricing Page Content:\n${pricingContent}` : "No dedicated pricing page found."}`;

    // Call Claude
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: SYSTEM_PROMPT,
      prompt: `Analyze this website for PLG readiness:\n\n${websiteContent}`,
      maxOutputTokens: 4000,
    });

    // Parse JSON response (handle markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonText);

    // Save report to Supabase (don't block response if it fails)
    let reportId: string | null = null;
    let reportSlug: string | null = null;
    try {
      let siteName = normalizedUrl;
      try {
        siteName = new URL(normalizedUrl).hostname;
      } catch {
        // keep raw URL
      }

      // Generate a unique slug
      const baseSlug = generateSlug(siteName, "plg");
      let slug = baseSlug;
      const { data: existing } = await supabase
        .from("reports")
        .select("slug")
        .like("slug", `${baseSlug}%`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        const lastSlug = existing[0].slug as string;
        const match = lastSlug.match(/-(\d+)$/);
        if (match) {
          slug = `${baseSlug}-${parseInt(match[1]) + 1}`;
        } else {
          slug = `${baseSlug}-2`;
        }
      }

      const { data: report, error: dbError } = await supabase
        .from("reports")
        .insert({
          url: normalizedUrl,
          site_name: siteName,
          overall_score: result.overallScore,
          summary: result.summary,
          categories: result.categories,
          strengths: result.strengths,
          improvements: result.improvements,
          tool: "plg",
          slug,
        })
        .select("id, slug")
        .single();

      if (dbError) {
        console.error("Supabase insert error:", dbError);
      } else if (report) {
        reportId = report.id;
        reportSlug = report.slug;
      }
    } catch (dbError) {
      console.error("Failed to save report:", dbError);
    }

    return NextResponse.json({ ...result, reportId, slug: reportSlug });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Give it another go." },
      { status: 500 }
    );
  }
}
