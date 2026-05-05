import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are an expert Product-Led Growth (PLG) analyst working for a top-tier web design agency. You're preparing a detailed assessment that will be shared directly with a founder or head of marketing. This needs to feel like a $5k strategy consultation, not a generic audit.

Analyze the provided website content and return a JSON response scoring the site across 7 PLG categories.

Score each category 0-100. Be brutally honest:
- 0-20: Fundamentally broken or completely absent
- 21-40: Major gaps that actively hurt conversion
- 41-60: Present but mediocre — not helping, not hurting much
- 61-75: Solid foundation with clear room to improve
- 76-90: Strong execution with minor optimisations needed
- 91-100: Best-in-class, genuinely impressive (rare — reserve this)

For each category, think deeply about:
1. **Value Prop** — Can a visitor understand what this company does, who it's for, and why it matters within 5 seconds? Is the positioning specific or generic? Does the headline pass the "so what?" test? Would a competitor's name work just as well in this headline?
2. **Self-Service** — Can someone sign up, start a trial, or use the product without talking to sales? How many clicks to value? Is there a freemium tier? Is the signup flow frictionless or does it demand too much upfront?
3. **Onboarding** — What happens after signup? Are there signals of guided onboarding (tooltips, getting-started flows, empty states)? Does the site communicate what the first 5 minutes look like?
4. **Social Proof** — Are there logos, testimonials, case studies, metrics, G2/Capterra badges, press mentions? Are testimonials from named people with titles and photos, or anonymous? Is proof placed near conversion points?
5. **CTA Clarity** — Is there one clear primary CTA or competing actions? Do CTAs use specific value language ("Start monitoring free") or vague ("Get started")? Is the CTA visible without scrolling? Do secondary CTAs create confusion?
6. **Visibility** — Can visitors see the product before committing? Screenshots, interactive demos, video walkthroughs, sample dashboards? Or is it a "trust us" black box? Does the site show the product solving a real problem?
7. **Pricing** — Is pricing public? Is it easy to understand? Can visitors self-select a plan? Are there hidden costs or "contact sales" barriers? Is there a free tier or trial clearly communicated?

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<3-4 sentence overview. Open with the single most important finding. Then cover the biggest opportunity. End with a specific, compelling observation that shows you actually looked at the site — quote a headline, reference a specific page element, or name a missing feature.>",
  "categories": [
    {
      "name": "Value Prop",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Quote the actual headline or tagline. Explain what works or doesn't. Compare to what best-in-class looks like.>"
    },
    {
      "name": "Self-Service",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "Onboarding",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "Social Proof",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "CTA Clarity",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "Visibility",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "Pricing",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    }
  ],
  "strengths": [
    {
      "title": "<strength title>",
      "impact": "HIGH" | "MEDIUM",
      "description": "<3-4 sentences. Be specific — quote text from the site, name exact elements, explain WHY this is effective. Don't just say 'good social proof' — say 'The three named testimonials from VP-level buyers at recognisable companies (Acme, BigCo) placed directly below the pricing table are perfectly positioned to overcome objections at the decision point.'>"
    }
  ],
  "improvements": [
    {
      "title": "<improvement title>",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "description": "<2-3 sentences explaining the problem. Reference what you observed (or didn't observe) on the site.>",
      "recommendation": "<2-3 sentences with a specific, actionable fix. Not 'add social proof' but 'Add 2-3 named customer testimonials with titles and company names directly below the hero section. Include a specific metric or outcome — e.g. "Cut onboarding time by 60%" — to make the proof tangible.'>"
    }
  ]
}

Tone: Direct, expert, consultative. Like a sharp strategist giving honest feedback to a founder over coffee. Short sentences. No filler. No hedging.

Provide 5-6 strengths and 5-6 improvements. Return improvements sorted by priority — most impactful first. Every finding must reference something specific from the website — if you can't point to a real element, don't include it.

The overall score is a weighted average — Value Prop and Self-Service matter most for PLG readiness. A site that gates everything behind "Book a demo" with no self-service path cannot score above 40 overall, regardless of how polished the design is.`;

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
    structure: "structure-assessment",
    "seo-aeo": "seo-aeo-assessment",
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
      maxOutputTokens: 8000,
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
