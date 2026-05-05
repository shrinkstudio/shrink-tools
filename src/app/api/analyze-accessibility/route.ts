import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are a senior web accessibility consultant preparing a professional WCAG 2.1 AA compliance assessment. This report will be shared directly with a company's leadership team. It needs to feel authoritative, specific, and actionable — like a $3k accessibility audit, not a generic checker output.

Analyze the provided website HTML and return a JSON response scoring across 7 categories.

Score each category 0-100. Be honest but constructive:
- 0-20: Not yet addressed - significant opportunity to improve
- 21-40: Early stage - some areas need attention
- 41-60: Partial - good intent visible, room to strengthen
- 61-75: Good foundation - meets basics with gaps to close
- 76-90: Strong - proactive accessibility with minor refinements needed
- 91-100: Exemplary - genuine best-practice implementation (rare)

For each category, assess thoroughly:
1. **Colour & Contrast** — Are there contrast ratio issues visible in the markup (light greys on white, low-contrast placeholder text)? Are colour-only indicators used for status/errors? Are focus indicators styled or browser-default? Check for CSS classes that suggest custom focus styles or their absence.
2. **Images & Media** — Count images with vs without alt text. Are alt texts descriptive or just filenames? Are decorative images marked with alt="" or role="presentation"? Are there videos/iframes without captions or transcripts?
3. **Keyboard Nav** — Are skip links present? Are there tabindex values > 0 (anti-pattern)? Are custom interactive elements (divs with onclick) keyboard-accessible? Are there elements that could trap keyboard focus? Check for outline:none or outline:0 in styles.
4. **Screen Reader** — Are ARIA landmarks used correctly? Are there aria-labels on icon-only buttons? Is aria-hidden used appropriately? Are live regions present for dynamic content? Check for "click here" or "read more" link text. Are there empty links or buttons?
5. **Forms & Inputs** — Are all inputs associated with labels (via for/id or wrapping)? Are required fields marked with more than just colour? Are autocomplete attributes present on common fields (email, name, address)? Are error messages programmatically associated?
6. **Structure & Semantics** — Is there a lang attribute on <html>? Is heading hierarchy logical (no skipped levels)? Are semantic elements used (nav, main, article, aside) vs div soup? Is there exactly one h1? Does the page title describe the page content?
7. **Responsive & Adaptable** — Is viewport meta properly configured (with user-scalable not disabled)? Are there signals of responsive design in the markup? Are touch targets appropriately sized (check for very small clickable elements)?

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<3-4 sentences. Lead with something genuinely positive about the site's accessibility efforts. Then highlight the most impactful opportunity. End with a specific observation. Frame gaps as opportunities to improve, not failures.>",
  "categories": [
    {
      "name": "Colour & Contrast",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific evidence from the HTML.>"
    },
    {
      "name": "Images & Media",
      "score": <number 0-100>,
      "description": "<2-3 sentences. State the ratio of images with/without alt text. Quote examples of good or bad alt text.>"
    },
    {
      "name": "Keyboard Nav",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "Screen Reader",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "Forms & Inputs",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "Structure & Semantics",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "Responsive & Adaptable",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    }
  ],
  "strengths": [
    {
      "title": "<strength title>",
      "impact": "HIGH" | "MEDIUM",
      "description": "<3-4 sentences. Reference exact HTML elements, attribute values, or patterns you observed. Explain why this matters for real users — e.g. 'The lang=\"en\" attribute on <html> ensures screen readers like NVDA and JAWS use the correct pronunciation engine, which directly affects comprehension for blind users.'>"
    }
  ],
  "improvements": [
    {
      "title": "<improvement title>",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "description": "<2-3 sentences. Reference the specific failing elements.>",
      "recommendation": "<2-3 sentences with exact fix. Not 'add alt text' but 'The hero image (earth-monitoring-dashboard.png) needs descriptive alt text like \"Earth Blox satellite monitoring dashboard showing real-time deforestation alerts across the Amazon basin\". The 12 team headshots in the About section should use format: \"[Name], [Role] at Earth Blox\".'>"
    }
  ]
}

Tone: Warm, knowledgeable, supportive. Like an accessibility expert who genuinely wants to help, not audit and punish. Lead with what's working. Frame gaps as easy wins and opportunities, not failures or risks. Avoid words like "broken", "failing", "barriers", "excluded". The founder built this site - respect that effort.

Mention compliance context (EAA, WCAG) as helpful context, not as threats. Frame it as "here's how to get ahead of this" not "you're at risk."

Provide 5-6 strengths and 5-6 improvements. Improvements sorted by priority. Every finding must reference specific elements from the HTML.`;

function extractAccessibilityContent(html: string) {
  const $ = cheerio.load(html);

  const htmlLang = $("html").attr("lang") || "";
  const viewportMeta = $('meta[name="viewport"]').attr("content") || "";

  // Remove scripts/styles for text extraction but capture structure first
  const headings = $("h1, h2, h3, h4, h5, h6")
    .map((_, el) => ({
      tag: (el as unknown as { tagName: string }).tagName,
      text: $(el).text().trim(),
    }))
    .get()
    .filter((h) => h.text);

  const images = $("img")
    .map((_, el) => ({
      src: $(el).attr("src") || "",
      alt: $(el).attr("alt"),
      hasAlt: $(el).attr("alt") !== undefined,
      altText: $(el).attr("alt") || "",
    }))
    .get()
    .slice(0, 30);

  const links = $("a")
    .map((_, el) => ({
      text: $(el).text().trim(),
      href: $(el).attr("href") || "",
      ariaLabel: $(el).attr("aria-label") || "",
    }))
    .get()
    .filter((l) => l.text || l.ariaLabel)
    .slice(0, 80);

  const forms = $("form")
    .map((_, form) => {
      const $form = $(form);
      return {
        inputs: $form
          .find("input, select, textarea")
          .map((_, input) => ({
            type: $(input).attr("type") || (input as unknown as { tagName: string }).tagName.toLowerCase(),
            id: $(input).attr("id") || "",
            name: $(input).attr("name") || "",
            ariaLabel: $(input).attr("aria-label") || "",
            autocomplete: $(input).attr("autocomplete") || "",
            hasLabel: $(input).attr("id")
              ? $(`label[for="${$(input).attr("id")}"]`).length > 0
              : false,
          }))
          .get(),
        hasFieldset: $form.find("fieldset").length > 0,
        hasLegend: $form.find("legend").length > 0,
      };
    })
    .get();

  const ariaAttributes = $(
    "[role], [aria-label], [aria-labelledby], [aria-describedby]"
  )
    .map((_, el) => ({
      tag: (el as unknown as { tagName: string }).tagName,
      role: $(el).attr("role") || "",
      ariaLabel: $(el).attr("aria-label") || "",
    }))
    .get()
    .slice(0, 50);

  const landmarks = $(
    'header, nav, main, footer, aside, [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], [role="complementary"]'
  )
    .map((_, el) => ({
      tag: (el as unknown as { tagName: string }).tagName,
      role: $(el).attr("role") || "",
      ariaLabel: $(el).attr("aria-label") || "",
    }))
    .get();

  const skipLinks = $("a")
    .filter((_, el) => {
      const href = $(el).attr("href") || "";
      return (
        href.startsWith("#main") ||
        href.startsWith("#content") ||
        href.startsWith("#skip") ||
        $(el).text().toLowerCase().includes("skip")
      );
    })
    .map((_, el) => ({
      text: $(el).text().trim(),
      href: $(el).attr("href") || "",
    }))
    .get();

  const tabindexElements = $("[tabindex]")
    .map((_, el) => ({
      tag: (el as unknown as { tagName: string }).tagName,
      tabindex: $(el).attr("tabindex") || "",
      text: $(el).text().trim().slice(0, 50),
    }))
    .get()
    .slice(0, 20);

  const buttons = $(
    'button, [role="button"], input[type="submit"], input[type="button"]'
  )
    .map((_, el) => ({
      text: $(el).text().trim() || $(el).attr("value") || "",
      ariaLabel: $(el).attr("aria-label") || "",
      type: $(el).attr("type") || "",
    }))
    .get()
    .filter((b) => b.text || b.ariaLabel);

  // Clean up for text content
  $("script, style, noscript, svg").remove();

  const title = $("title").text().trim();
  const metaDescription = $('meta[name="description"]').attr("content") || "";

  return {
    title,
    metaDescription,
    htmlLang,
    viewportMeta,
    headings,
    images,
    links,
    forms,
    ariaAttributes,
    landmarks,
    skipLinks,
    tabindexElements,
    buttons,
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
        {
          error:
            "That doesn't look like a URL. Try something like stripe.com",
        },
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

    // Extract accessibility-specific content
    const extracted = extractAccessibilityContent(html);

    // Build prompt content
    const websiteContent = `Website URL: ${normalizedUrl}
Title: ${extracted.title}
Meta Description: ${extracted.metaDescription}

HTML lang attribute: ${extracted.htmlLang || "NOT SET"}
Viewport meta: ${extracted.viewportMeta || "NOT SET"}

Heading Hierarchy:
${extracted.headings.map((h) => `${h.tag}: ${h.text}`).join("\n") || "No headings found"}

Images (${extracted.images.length} total):
${extracted.images
  .map(
    (img) =>
      `- ${img.hasAlt ? `alt="${img.altText}"` : "NO ALT ATTRIBUTE"} (src: ${img.src})`
  )
  .join("\n") || "No images found"}

Links (${extracted.links.length} total):
${extracted.links
  .slice(0, 50)
  .map(
    (l) =>
      `- "${l.text}"${l.ariaLabel ? ` [aria-label="${l.ariaLabel}"]` : ""} → ${l.href}`
  )
  .join("\n")}

Skip Links: ${extracted.skipLinks.length > 0 ? extracted.skipLinks.map((s) => `"${s.text}" → ${s.href}`).join(", ") : "None found"}

Landmarks:
${extracted.landmarks.map((l) => `- <${l.tag}>${l.role ? ` role="${l.role}"` : ""}${l.ariaLabel ? ` aria-label="${l.ariaLabel}"` : ""}`).join("\n") || "No landmarks found"}

ARIA Usage (${extracted.ariaAttributes.length} elements):
${extracted.ariaAttributes
  .slice(0, 30)
  .map(
    (a) =>
      `- <${a.tag}>${a.role ? ` role="${a.role}"` : ""}${a.ariaLabel ? ` aria-label="${a.ariaLabel}"` : ""}`
  )
  .join("\n") || "No ARIA attributes found"}

Forms (${extracted.forms.length} total):
${extracted.forms
  .map(
    (f, i) =>
      `Form ${i + 1}: ${f.inputs.length} inputs, ${f.inputs.filter((inp) => inp.hasLabel).length} with labels, fieldset: ${f.hasFieldset}, legend: ${f.hasLegend}\n  Inputs: ${f.inputs.map((inp) => `${inp.type}(id="${inp.id}", label=${inp.hasLabel}, autocomplete="${inp.autocomplete}")`).join(", ")}`
  )
  .join("\n") || "No forms found"}

Buttons (${extracted.buttons.length} total):
${extracted.buttons
  .map(
    (b) =>
      `- "${b.text}"${b.ariaLabel ? ` [aria-label="${b.ariaLabel}"]` : ""}`
  )
  .join("\n") || "No buttons found"}

Tabindex elements: ${extracted.tabindexElements.length > 0 ? extracted.tabindexElements.map((t) => `<${t.tag} tabindex="${t.tabindex}">`).join(", ") : "None found"}`;

    // Call Claude
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: SYSTEM_PROMPT,
      prompt: `Analyze this website for accessibility:\n\n${websiteContent}`,
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

    // Save report to Supabase
    let reportId: string | null = null;
    let reportSlug: string | null = null;
    try {
      let siteName = normalizedUrl;
      try {
        siteName = new URL(normalizedUrl).hostname;
      } catch {
        // keep raw URL
      }

      const baseSlug = generateSlug(siteName, "accessibility");
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
          tool: "accessibility",
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
