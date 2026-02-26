import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are an expert information architecture and web structure analyst. Analyze the provided website content and return a JSON response scoring the site across 7 structural categories.

Score each category 0-100 based on what you can observe in the HTML:

1. **Navigation** — Primary navigation is clear and consistent. Labels are descriptive (not vague like "Solutions" or "Resources" with no context). Navigation doesn't exceed 7±2 top-level items. Dropdown/mega menu structure is logical. Breadcrumbs present for deep pages.

2. **URL Structure** — URLs are clean, readable, and descriptive (not /page?id=123). Consistent URL patterns across the site. Logical hierarchy reflected in URL path (e.g. /blog/category/post). No excessive nesting (more than 3-4 levels deep is a warning). No URL parameters where clean URLs would work.

3. **Internal Linking** — Pages link to related content contextually. Anchor text is descriptive (not "click here" or "read more"). Footer isn't overloaded with links as a crutch for poor navigation. Key pages are reachable within 3 clicks from the homepage.

4. **Page Hierarchy** — Clear heading hierarchy (h1 → h2 → h3, no skipping levels). Only one h1 per page. Headings accurately describe the content that follows. Content is logically grouped under headings. Heading structure would make sense as a table of contents.

5. **Mobile Structure** — Viewport meta is properly configured. Content stacking order makes sense for mobile. Touch-friendly tap targets (no tiny links crammed together). Responsive images and media. Mobile-specific navigation works logically.

6. **Performance Hints** — Images have width/height attributes (prevents layout shift). Critical resources are preloaded or prioritised. No render-blocking scripts in the head without async/defer. Lazy loading on below-the-fold images. Font loading strategy (font-display: swap or similar). Minimal third-party script bloat visible in the HTML.

7. **Content Organisation** — Content is scannable (short paragraphs, clear sections). Related content is grouped logically. CTAs are placed in context (not randomly inserted). Information density is appropriate. Key information is above the fold. Content follows a logical flow (problem → solution → proof → action).

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence overview of the site's structural quality>",
  "categories": [
    {
      "name": "Navigation",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "URL Structure",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Internal Linking",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Page Hierarchy",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Mobile Structure",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Performance Hints",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Content Organisation",
      "score": <number 0-100>,
      "description": "<brief assessment>"
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

Write like you're giving honest, practical feedback to a founder over coffee. Short sentences. No filler. This is a sales tool — findings should make the prospect think "I need professional help to fix this" while being encouraging about what's working.

Be specific and reference actual content from the website. Provide 3-4 strengths and 3-4 improvements. Return improvements sorted by priority — most impactful first. Be honest. If something genuinely hurts discoverability or user experience, mark it HIGH.

Scores should be realistic and varied — don't give everything 60-80. A site with broken heading hierarchy should score very low on Page Hierarchy. A site with vague navigation labels and 15 top-level items should score low on Navigation.

If you can't fully assess something from a single page's HTML alone (like full site-wide linking patterns), note the limitation but assess what you can see. Focus on things that genuinely impact user experience and discoverability.`;

function extractStructureContent(html: string) {
  const $ = cheerio.load(html);

  const viewportMeta = $('meta[name="viewport"]').attr("content") || "";

  // Capture navigation structure before removing elements
  const navElements = $("nav, [role='navigation']")
    .map((_, nav) => {
      const $nav = $(nav);
      return {
        ariaLabel: $nav.attr("aria-label") || "",
        links: $nav
          .find("a")
          .map((_, a) => ({
            text: $(a).text().trim(),
            href: $(a).attr("href") || "",
          }))
          .get()
          .filter((l) => l.text)
          .slice(0, 30),
      };
    })
    .get();

  // Heading hierarchy
  const headings = $("h1, h2, h3, h4, h5, h6")
    .map((_, el) => ({
      tag: (el as unknown as { tagName: string }).tagName,
      text: $(el).text().trim(),
    }))
    .get()
    .filter((h) => h.text);

  const h1Count = $("h1").length;

  // All links with context
  const allLinks = $("a")
    .map((_, el) => ({
      text: $(el).text().trim(),
      href: $(el).attr("href") || "",
      isExternal:
        ($(el).attr("href") || "").startsWith("http") &&
        !($(el).attr("href") || "").includes(
          $('meta[property="og:url"]').attr("content") || "NOMATCH"
        ),
    }))
    .get()
    .filter((l) => l.text || l.href)
    .slice(0, 150);

  // Internal vs external link counts
  const internalLinks = allLinks.filter(
    (l) => l.href.startsWith("/") || l.href.startsWith("#") || !l.href.startsWith("http")
  );
  const externalLinks = allLinks.filter((l) => l.href.startsWith("http"));

  // Vague anchor text detection
  const vagueAnchors = allLinks.filter((l) => {
    const lower = l.text.toLowerCase();
    return (
      lower === "click here" ||
      lower === "read more" ||
      lower === "learn more" ||
      lower === "here" ||
      lower === "more" ||
      lower === "link"
    );
  });

  // Footer links
  const footerLinks = $("footer a, [role='contentinfo'] a")
    .map((_, el) => ({
      text: $(el).text().trim(),
      href: $(el).attr("href") || "",
    }))
    .get()
    .filter((l) => l.text);

  // Breadcrumbs
  const breadcrumbs = $(
    '[class*="breadcrumb"], [aria-label*="breadcrumb"], [aria-label*="Breadcrumb"], ol[class*="bread"], nav[aria-label="Breadcrumb"]'
  )
    .map((_, el) => $(el).text().trim())
    .get();

  // Images analysis
  const images = $("img")
    .map((_, el) => ({
      src: $(el).attr("src") || "",
      alt: $(el).attr("alt") || "",
      hasWidth: !!$(el).attr("width"),
      hasHeight: !!$(el).attr("height"),
      loading: $(el).attr("loading") || "",
    }))
    .get()
    .slice(0, 40);

  // Scripts in head
  const headScripts = $("head script")
    .map((_, el) => ({
      src: $(el).attr("src") || "inline",
      async: !!$(el).attr("async"),
      defer: !!$(el).attr("defer"),
      type: $(el).attr("type") || "",
    }))
    .get();

  // Preload/preconnect hints
  const resourceHints = $('link[rel="preload"], link[rel="preconnect"], link[rel="dns-prefetch"]')
    .map((_, el) => ({
      rel: $(el).attr("rel") || "",
      href: $(el).attr("href") || "",
      as: $(el).attr("as") || "",
    }))
    .get();

  // Font display
  const fontFaces = html.match(/font-display\s*:\s*(\w+)/g) || [];

  // Third-party scripts
  const thirdPartyScripts = $("script[src]")
    .map((_, el) => $(el).attr("src") || "")
    .get()
    .filter((src) => src.startsWith("http"));

  // Clean up for text content
  $("script, style, noscript, svg").remove();

  const title = $("title").text().trim();
  const metaDescription = $('meta[name="description"]').attr("content") || "";

  // Paragraphs for content analysis
  const paragraphs = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 40);

  // Sections / content grouping
  const sections = $("section, [role='region'], article")
    .map((_, el) => ({
      tag: (el as unknown as { tagName: string }).tagName,
      ariaLabel: $(el).attr("aria-label") || "",
      headingText: $(el).find("h1, h2, h3").first().text().trim(),
    }))
    .get()
    .slice(0, 20);

  // CTAs / buttons
  const ctas = $(
    'button, [role="button"], a[class*="btn"], a[class*="button"], a[class*="cta"]'
  )
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  return {
    title,
    metaDescription,
    viewportMeta,
    navElements,
    headings,
    h1Count,
    allLinks: allLinks.slice(0, 80),
    internalLinkCount: internalLinks.length,
    externalLinkCount: externalLinks.length,
    vagueAnchors,
    footerLinks,
    breadcrumbs,
    images,
    headScripts,
    resourceHints,
    fontFaces,
    thirdPartyScripts,
    paragraphs,
    sections,
    ctas,
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

    // Extract structure-specific content
    const extracted = extractStructureContent(html);

    // Build prompt content
    const websiteContent = `Website URL: ${normalizedUrl}
Title: ${extracted.title}
Meta Description: ${extracted.metaDescription}
Viewport meta: ${extracted.viewportMeta || "NOT SET"}

Navigation Elements (${extracted.navElements.length} nav regions):
${extracted.navElements
  .map(
    (nav, i) =>
      `Nav ${i + 1}${nav.ariaLabel ? ` (${nav.ariaLabel})` : ""}: ${nav.links.length} links\n  ${nav.links.map((l) => `"${l.text}" → ${l.href}`).join("\n  ")}`
  )
  .join("\n") || "No navigation elements found"}

Heading Hierarchy (h1 count: ${extracted.h1Count}):
${extracted.headings.map((h) => `${h.tag}: ${h.text}`).join("\n") || "No headings found"}

Links Summary:
- Total: ${extracted.allLinks.length}
- Internal: ${extracted.internalLinkCount}
- External: ${extracted.externalLinkCount}
- Vague anchor text ("click here", "read more", etc.): ${extracted.vagueAnchors.length}${extracted.vagueAnchors.length > 0 ? ` — ${extracted.vagueAnchors.map((a) => `"${a.text}" → ${a.href}`).join(", ")}` : ""}

Sample Links:
${extracted.allLinks
  .slice(0, 50)
  .map((l) => `- "${l.text}" → ${l.href}${l.isExternal ? " (external)" : ""}`)
  .join("\n")}

Footer Links (${extracted.footerLinks.length}):
${extracted.footerLinks.map((l) => `- "${l.text}" → ${l.href}`).join("\n") || "No footer links found"}

Breadcrumbs: ${extracted.breadcrumbs.length > 0 ? extracted.breadcrumbs.join(" | ") : "None found"}

Images (${extracted.images.length} total):
${extracted.images
  .map(
    (img) =>
      `- ${img.src.slice(0, 60)} | width/height: ${img.hasWidth && img.hasHeight ? "yes" : "MISSING"} | loading: ${img.loading || "default"}`
  )
  .join("\n") || "No images found"}

Head Scripts (${extracted.headScripts.length}):
${extracted.headScripts
  .map(
    (s) =>
      `- ${s.src.slice(0, 80)} | async: ${s.async} | defer: ${s.defer}`
  )
  .join("\n") || "None"}

Resource Hints: ${extracted.resourceHints.length > 0 ? extracted.resourceHints.map((r) => `${r.rel}(${r.href.slice(0, 50)})`).join(", ") : "None found"}

Font Display Rules: ${extracted.fontFaces.length > 0 ? extracted.fontFaces.join(", ") : "None found"}

Third-Party Scripts (${extracted.thirdPartyScripts.length}):
${extracted.thirdPartyScripts.map((s) => `- ${s.slice(0, 80)}`).join("\n") || "None"}

Content Sections (${extracted.sections.length}):
${extracted.sections
  .map(
    (s) =>
      `- <${s.tag}>${s.ariaLabel ? ` "${s.ariaLabel}"` : ""}${s.headingText ? ` heading: "${s.headingText}"` : ""}`
  )
  .join("\n") || "No semantic sections found"}

CTAs/Buttons: ${extracted.ctas.join(", ") || "None found"}

Content Paragraphs (${extracted.paragraphs.length} total, first 20):
${extracted.paragraphs.slice(0, 20).join("\n")}`;

    // Call Claude
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: SYSTEM_PROMPT,
      prompt: `Analyze this website's structure and information architecture:\n\n${websiteContent}`,
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

      const baseSlug = generateSlug(siteName, "structure");
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
          tool: "structure",
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
