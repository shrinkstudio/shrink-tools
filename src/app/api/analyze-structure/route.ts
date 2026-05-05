import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are a senior information architect and web performance consultant preparing a professional structure assessment. This report will be shared directly with a company's marketing or product lead. It needs to feel like expert-level analysis — specific, evidence-based, and immediately actionable.

Analyze the provided website HTML and return a JSON response scoring across 7 structural categories.

Score each category 0-100. Be honest but constructive:
- 0-20: Not yet addressed - big opportunity here
- 21-40: Early stage - some foundation to build on
- 41-60: Functional - works but has room to strengthen
- 61-75: Solid foundation with clear room to improve
- 76-90: Well-structured with minor optimisations needed
- 91-100: Textbook implementation (rare)

For each category, assess thoroughly:
1. **Navigation** — Count the top-level nav items. Are labels specific ("Pricing", "API Docs") or vague ("Solutions", "Resources")? Is there a clear primary CTA in the nav? Are dropdowns/mega menus logically grouped? Would a first-time visitor know where to find pricing, docs, or support within 3 seconds? Compare to SaaS best practice (5-7 top-level items, clear hierarchy).
2. **URL Structure** — Analyze every URL visible in the HTML. Are they clean and readable (/blog/category/post) or messy (/page?id=123)? Is there consistent naming convention? How deep is the nesting? Are there redundant URL segments?
3. **Internal Linking** — Is anchor text descriptive or generic ("Learn more", "Click here")? Are contextual links connecting related content? Is the footer being used as a sitemap crutch? Count internal vs external links. Are key pages (pricing, product, about) linked prominently?
4. **Page Hierarchy** — Map the exact heading hierarchy. Is there exactly one h1? Are levels skipped (h1 → h3)? Do headings accurately describe what follows? Would the heading structure work as a table of contents? Quote the actual headings.
5. **Mobile Structure** — Is viewport meta properly set? Is user-scalable disabled (anti-pattern)? Are there signals of responsive design in the markup? Are touch targets adequately sized? Are images responsive (srcset, sizes)?
6. **Performance Hints** — Count images with/without width+height attributes. Are scripts async/deferred or render-blocking? Is lazy loading used? Are there preload/preconnect hints? Count third-party scripts and identify what they are (analytics, chat widgets, etc.). Is there font-display: swap?
7. **Content Organisation** — Is content scannable? Are sections clearly delineated? Do CTAs appear in logical context (after explaining value, not randomly)? Is above-the-fold content compelling? Does the page follow problem → solution → proof → action flow? Are there semantic section elements or just div soup?

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<3-4 sentences. Lead with something genuinely positive about the site's structure. Then highlight the most impactful opportunity. End with a specific observation. Frame gaps as opportunities, not failures.>",
  "categories": [
    {
      "name": "Navigation",
      "score": <number 0-100>,
      "description": "<2-3 sentences. List the actual nav items. Assess their clarity and structure.>"
    },
    {
      "name": "URL Structure",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Quote example URLs from the site. Note patterns.>"
    },
    {
      "name": "Internal Linking",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Reference specific anchor text examples.>"
    },
    {
      "name": "Page Hierarchy",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Map the heading structure. Note any skipped levels or multiple h1s.>"
    },
    {
      "name": "Mobile Structure",
      "score": <number 0-100>,
      "description": "<2-3 sentences with specific observations.>"
    },
    {
      "name": "Performance Hints",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Count specific issues (e.g. '14 of 18 images missing width/height').>"
    },
    {
      "name": "Content Organisation",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Assess the content flow and section structure.>"
    }
  ],
  "strengths": [
    {
      "title": "<strength title>",
      "impact": "HIGH" | "MEDIUM",
      "description": "<3-4 sentences. Reference exact elements, URL patterns, or structural decisions. Explain why this matters for users and search engines.>"
    }
  ],
  "improvements": [
    {
      "title": "<improvement title>",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "description": "<2-3 sentences. Reference the specific structural issue with evidence from the HTML.>",
      "recommendation": "<2-3 sentences with a concrete fix. Not 'improve navigation' but 'Consolidate the 11 top-level nav items to 6: Product, Use Cases, Pricing, Docs, Blog, Company. Move \"Careers\", \"Press\", and \"Partners\" under a \"Company\" dropdown. Add a prominent \"Start Free Trial\" CTA button as the rightmost nav item.'>"
    }
  ]
}

Tone: Warm, expert, practical. Like a knowledgeable friend reviewing the site with the founder. Lead with what's working well. Frame gaps as quick wins and opportunities. Avoid words like "broken", "confusing", "frustrating", "poor". Every observation backed by evidence from the HTML.

Provide 5-6 strengths and 5-6 improvements. Improvements sorted by priority. If you can't fully assess something from a single page (like deep site-wide linking), note the limitation but assess what's visible. Focus on things that genuinely impact user experience, conversion, and search engine crawlability.`;

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
- Vague anchor text ("click here", "read more", etc.): ${extracted.vagueAnchors.length}${extracted.vagueAnchors.length > 0 ? `  - ${extracted.vagueAnchors.map((a) => `"${a.text}" → ${a.href}`).join(", ")}` : ""}

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
