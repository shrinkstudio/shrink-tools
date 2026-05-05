import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are a senior SEO strategist and AI search specialist preparing a professional visibility assessment. This report will be shared directly with a company's marketing lead or founder. It needs to demonstrate deep expertise in both traditional SEO and the emerging AI search landscape (ChatGPT, Perplexity, Google AI Overviews, Claude) — the kind of analysis that makes them want to hire you immediately.

Analyze the provided website HTML and return a JSON response scoring across 7 categories.

Score each category 0-100. Be precise and differentiated:
- 0-20: Critical gaps — invisible to search engines and AI models
- 21-40: Major issues — losing significant traffic and visibility
- 41-60: Basic implementation — not competitive in 2025/2026
- 61-75: Good foundation — ahead of average but behind leaders
- 76-90: Strong — proactive optimisation with minor gaps
- 91-100: Best-in-class (rare — reserve for genuinely excellent implementations)

For each category, assess thoroughly:
1. **Meta & On-Page SEO** — Quote the actual title tag and its character count. Quote the meta description and its length. Is the canonical set? List which OG tags are present vs missing. Are Twitter Cards configured? Is robots meta accidentally blocking anything? Check for favicon, apple-touch-icon. Are there meta keywords (outdated signal)?
2. **Heading & Content** — Quote the h1. Map the heading hierarchy. Are headings keyword-rich without stuffing? Is content substantive or thin? Does key information appear early? Is content length appropriate for a homepage vs product page vs blog?
3. **Schema & Structured Data** — List every schema type found. Is it JSON-LD (preferred) or microdata? Assess completeness of each schema block — are required and recommended properties filled in? What schema types are MISSING that should be there (FAQ, Product, SoftwareApplication, Organization, WebPage, BreadcrumbList)? Is there FAQ schema (critical for AI citations)?
4. **AI Visibility & Citability** — THIS IS THE MOST IMPORTANT CATEGORY. Assess: Does the site make clear, quotable factual statements in the first 2-3 paragraphs? ("X is a platform that does Y for Z" — AI models need this). Are questions explicitly asked and answered? (Q&A sections, FAQ pages). Are there unique statistics, data points, or claims? Is content structured for extraction (clear sections, definition-like statements)? Would ChatGPT/Perplexity/Claude cite this site when asked about this company's domain? Frame gaps with urgency — competitors optimising for AI search will capture this traffic.
5. **Technical SEO** — Is HTML clean and crawlable or JS-rendered with empty body? Count images with/without alt text. Identify broken link patterns (href="#", empty hrefs, javascript:void(0)). Check for hreflang tags. Look for sitemap/robots.txt references. Are there render-blocking resources?
6. **Content Quality & E-E-A-T** — Evidence of Experience (case studies, customer stories, real examples with specifics). Expertise (detailed, technical content — not generic marketing fluff). Authority (awards, publications, partnerships, notable customers). Trust (privacy policy, terms, real contact info, physical address, team page). Is copyright date current? Is there evidence of fresh content?
7. **Local & Entity Signals** — Is the company name consistently presented? NAP (name, address, phone) data? Organization schema with complete details? Social media profile links (LinkedIn, Twitter/X, GitHub — these help AI models build entity graphs)? Consistent brand naming throughout?

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<3-4 sentences. Lead with the biggest SEO or AI visibility finding. Reference specific elements. Create urgency around AI search readiness — this is where the market is going and most sites are unprepared.>",
  "categories": [
    {
      "name": "Meta & On-Page SEO",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Quote the actual title tag and meta description. Note character counts. List missing OG/Twitter tags.>"
    },
    {
      "name": "Heading & Content",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Quote the h1. Describe the heading hierarchy. Assess content depth.>"
    },
    {
      "name": "Schema & Structured Data",
      "score": <number 0-100>,
      "description": "<2-3 sentences. List schema types found. Note what's missing.>"
    },
    {
      "name": "AI Visibility",
      "score": <number 0-100>,
      "description": "<3-4 sentences — this is the star category. Assess how citable and extractable the content is for AI models. Quote specific content that works or explain what's missing.>"
    },
    {
      "name": "Technical SEO",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Count specific issues.>"
    },
    {
      "name": "Content Quality & E-E-A-T",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Reference specific trust signals present or absent.>"
    },
    {
      "name": "Local & Entity Signals",
      "score": <number 0-100>,
      "description": "<2-3 sentences. Assess entity consistency and social/NAP signals.>"
    }
  ],
  "strengths": [
    {
      "title": "<strength title>",
      "impact": "HIGH" | "MEDIUM",
      "description": "<3-4 sentences. Reference exact meta tags, schema blocks, content patterns. Explain why this matters for rankings AND AI citations.>"
    }
  ],
  "improvements": [
    {
      "title": "<improvement title>",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "description": "<2-3 sentences with specific evidence from the HTML.>",
      "recommendation": "<2-3 sentences with exact fix. Not 'add schema' but 'Add Organization schema with name, url, logo, description, foundingDate, founders, sameAs (linking LinkedIn, Twitter, Crunchbase profiles). Add SoftwareApplication schema for the product with applicationCategory, operatingSystem, and offers. Add FAQ schema for the 6 questions in the footer FAQ section — this alone could trigger rich snippets and AI citations.'>"
    }
  ]
}

Tone: Expert who genuinely understands where search is going. Create urgency around AI visibility — most companies are sleeping on this. Be specific about what their competitors who optimise for AI search will capture.

Provide 5-6 strengths and 5-6 improvements. Improvements sorted by priority. Every finding must reference specific elements from the HTML. The AI Visibility category should be the most detailed and compelling section — this is your differentiator.`;

function extractSeoContent(html: string) {
  const $ = cheerio.load(html);

  // Meta tags
  const title = $("title").text().trim();
  const metaDescription = $('meta[name="description"]').attr("content") || "";
  const canonical = $('link[rel="canonical"]').attr("href") || "";
  const robotsMeta = $('meta[name="robots"]').attr("content") || "";
  const viewport = $('meta[name="viewport"]').attr("content") || "";

  // Open Graph
  const ogTags = $('meta[property^="og:"]')
    .map((_, el) => ({
      property: $(el).attr("property") || "",
      content: $(el).attr("content") || "",
    }))
    .get();

  // Twitter Card
  const twitterTags = $('meta[name^="twitter:"]')
    .map((_, el) => ({
      name: $(el).attr("name") || "",
      content: $(el).attr("content") || "",
    }))
    .get();

  // Favicon
  const favicon =
    $('link[rel="icon"]').attr("href") ||
    $('link[rel="shortcut icon"]').attr("href") ||
    "";
  const appleTouchIcon =
    $('link[rel="apple-touch-icon"]').attr("href") || "";

  // Heading hierarchy
  const headings = $("h1, h2, h3, h4, h5, h6")
    .map((_, el) => ({
      tag: (el as unknown as { tagName: string }).tagName,
      text: $(el).text().trim(),
    }))
    .get()
    .filter((h) => h.text);

  const h1Count = $("h1").length;
  const h1Text = $("h1").first().text().trim();

  // Schema / JSON-LD
  const jsonLdScripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).html() || "")
    .get();

  let schemaTypes: string[] = [];
  const schemaDetails: string[] = [];
  for (const script of jsonLdScripts) {
    try {
      const parsed = JSON.parse(script);
      if (parsed["@type"]) {
        schemaTypes.push(parsed["@type"]);
        schemaDetails.push(
          JSON.stringify(parsed).slice(0, 500)
        );
      }
      if (parsed["@graph"]) {
        for (const item of parsed["@graph"]) {
          if (item["@type"]) {
            schemaTypes.push(item["@type"]);
          }
        }
      }
    } catch {
      schemaDetails.push("(invalid JSON-LD)");
    }
  }

  // Links analysis
  const allLinks = $("a")
    .map((_, el) => ({
      text: $(el).text().trim(),
      href: $(el).attr("href") || "",
    }))
    .get()
    .filter((l) => l.text || l.href)
    .slice(0, 100);

  const brokenLinkPatterns = allLinks.filter(
    (l) => l.href === "#" || l.href === "" || l.href === "javascript:void(0)"
  );

  // Images
  const images = $("img")
    .map((_, el) => ({
      src: $(el).attr("src") || "",
      alt: $(el).attr("alt"),
      hasAlt: $(el).attr("alt") !== undefined,
      altText: $(el).attr("alt") || "",
    }))
    .get()
    .slice(0, 30);

  // Hreflang
  const hreflangTags = $('link[rel="alternate"][hreflang]')
    .map((_, el) => ({
      hreflang: $(el).attr("hreflang") || "",
      href: $(el).attr("href") || "",
    }))
    .get();

  // Sitemap / robots references
  const sitemapLink =
    $('link[rel="sitemap"]').attr("href") || "";
  const robotsTxtRef = allLinks.some((l) =>
    l.href.includes("robots.txt")
  );

  // Trust signals
  const privacyLink = allLinks.some(
    (l) =>
      l.text.toLowerCase().includes("privacy") ||
      l.href.includes("privacy")
  );
  const termsLink = allLinks.some(
    (l) =>
      l.text.toLowerCase().includes("terms") ||
      l.href.includes("terms")
  );
  const contactInfo = allLinks.some(
    (l) =>
      l.text.toLowerCase().includes("contact") ||
      l.href.includes("contact")
  );

  // Social media links
  const socialLinks = allLinks.filter((l) => {
    const href = l.href.toLowerCase();
    return (
      href.includes("linkedin.com") ||
      href.includes("twitter.com") ||
      href.includes("x.com") ||
      href.includes("facebook.com") ||
      href.includes("instagram.com") ||
      href.includes("youtube.com") ||
      href.includes("github.com")
    );
  });

  // Email / phone / address signals
  const emailLinks = allLinks.filter((l) =>
    l.href.startsWith("mailto:")
  );
  const phoneLinks = allLinks.filter((l) =>
    l.href.startsWith("tel:")
  );

  // Copyright / date signals
  const copyrightMatch = html.match(
    /©\s*(\d{4})|copyright\s*(\d{4})/i
  );
  const copyrightYear = copyrightMatch
    ? copyrightMatch[1] || copyrightMatch[2]
    : "";

  // Clean up for text content
  $("script, style, noscript, svg").remove();

  // Content paragraphs
  const paragraphs = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 40);

  // FAQ-like patterns
  const faqSections = $(
    '[class*="faq"], [class*="FAQ"], [id*="faq"], [id*="FAQ"], details, [itemtype*="FAQPage"]'
  ).length;

  // Q&A patterns in content
  const questionPatterns = paragraphs.filter(
    (p) => p.endsWith("?") || p.startsWith("Q:")
  );

  return {
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    canonical,
    robotsMeta,
    viewport,
    ogTags,
    twitterTags,
    favicon,
    appleTouchIcon,
    headings,
    h1Count,
    h1Text,
    jsonLdScripts: jsonLdScripts.length,
    schemaTypes,
    schemaDetails,
    allLinks: allLinks.slice(0, 60),
    brokenLinkPatterns,
    images,
    hreflangTags,
    sitemapLink,
    robotsTxtRef,
    privacyLink,
    termsLink,
    contactInfo,
    socialLinks,
    emailLinks,
    phoneLinks,
    copyrightYear,
    paragraphs,
    faqSections,
    questionPatterns,
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

    // Extract SEO/AEO-specific content
    const extracted = extractSeoContent(html);

    // Build prompt content
    const websiteContent = `Website URL: ${normalizedUrl}

=== META & ON-PAGE ===
Title: "${extracted.title}" (${extracted.titleLength} chars)
Meta Description: "${extracted.metaDescription}" (${extracted.metaDescriptionLength} chars)
Canonical: ${extracted.canonical || "NOT SET"}
Robots Meta: ${extracted.robotsMeta || "NOT SET (defaults to index, follow)"}
Viewport: ${extracted.viewport || "NOT SET"}
Favicon: ${extracted.favicon || "NOT FOUND"}
Apple Touch Icon: ${extracted.appleTouchIcon || "NOT FOUND"}

Open Graph Tags (${extracted.ogTags.length}):
${extracted.ogTags.map((t) => `- ${t.property}: ${t.content}`).join("\n") || "None found"}

Twitter Card Tags (${extracted.twitterTags.length}):
${extracted.twitterTags.map((t) => `- ${t.name}: ${t.content}`).join("\n") || "None found"}

=== HEADING & CONTENT ===
H1 Count: ${extracted.h1Count}
H1 Text: "${extracted.h1Text || "NO H1 FOUND"}"

Heading Hierarchy:
${extracted.headings.map((h) => `${h.tag}: ${h.text}`).join("\n") || "No headings found"}

Content Paragraphs (${extracted.paragraphs.length} total):
${extracted.paragraphs.slice(0, 25).join("\n")}

=== SCHEMA & STRUCTURED DATA ===
JSON-LD Scripts: ${extracted.jsonLdScripts}
Schema Types Found: ${extracted.schemaTypes.length > 0 ? extracted.schemaTypes.join(", ") : "NONE"}
${extracted.schemaDetails.map((d) => `Schema: ${d}`).join("\n")}

=== AI VISIBILITY SIGNALS ===
FAQ Sections Detected: ${extracted.faqSections}
Question Patterns in Content: ${extracted.questionPatterns.length > 0 ? extracted.questionPatterns.join(" | ") : "None found"}

=== TECHNICAL SEO ===
Links (${extracted.allLinks.length} total):
${extracted.allLinks.slice(0, 40).map((l) => `- "${l.text}" → ${l.href}`).join("\n")}

Broken Link Patterns (href="#" or empty): ${extracted.brokenLinkPatterns.length}${extracted.brokenLinkPatterns.length > 0 ? `  - ${extracted.brokenLinkPatterns.map((l) => `"${l.text}"`).join(", ")}` : ""}

Images (${extracted.images.length} total):
${extracted.images.map((img) => `- ${img.hasAlt ? `alt="${img.altText}"` : "NO ALT"} (${img.src.slice(0, 60)})`).join("\n") || "No images found"}

Hreflang Tags: ${extracted.hreflangTags.length > 0 ? extracted.hreflangTags.map((t) => `${t.hreflang}: ${t.href}`).join(", ") : "None"}
Sitemap Link: ${extracted.sitemapLink || "Not referenced"}

=== E-E-A-T & TRUST ===
Privacy Policy Link: ${extracted.privacyLink ? "Yes" : "No"}
Terms Link: ${extracted.termsLink ? "Yes" : "No"}
Contact Page Link: ${extracted.contactInfo ? "Yes" : "No"}
Copyright Year: ${extracted.copyrightYear || "Not found"}

=== LOCAL & ENTITY SIGNALS ===
Email Links: ${extracted.emailLinks.length > 0 ? extracted.emailLinks.map((l) => l.href).join(", ") : "None"}
Phone Links: ${extracted.phoneLinks.length > 0 ? extracted.phoneLinks.map((l) => l.href).join(", ") : "None"}
Social Media Links (${extracted.socialLinks.length}):
${extracted.socialLinks.map((l) => `- "${l.text}" → ${l.href}`).join("\n") || "None found"}`;

    // Call Claude
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: SYSTEM_PROMPT,
      prompt: `Analyze this website for SEO and AI Engine Optimisation:\n\n${websiteContent}`,
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

      const baseSlug = generateSlug(siteName, "seo-aeo");
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
          tool: "seo-aeo",
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
