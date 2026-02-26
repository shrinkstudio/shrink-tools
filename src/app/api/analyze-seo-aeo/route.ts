import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import * as cheerio from "cheerio";
import { supabase } from "@/lib/supabase";

const SYSTEM_PROMPT = `You are an expert SEO and AI Engine Optimisation (AEO) analyst. Analyze the provided website content and return a JSON response scoring the site across 7 categories covering both traditional SEO and AI visibility.

Score each category 0-100 based on what you can observe in the HTML:

1. **Meta & On-Page SEO**  - Title tag present, unique, descriptive, 50-60 characters. Meta description present, compelling, 150-160 characters. Canonical URL set correctly. Open Graph and Twitter Card meta tags present. Robots meta tag not accidentally blocking indexing. Favicon and apple-touch-icon present.

2. **Heading & Content Structure**  - Single h1 that clearly describes the page topic. Logical heading hierarchy (h1 → h2 → h3). Headings contain relevant keywords naturally (not stuffed). Content length is appropriate for the page type. Content is original and substantive (not thin). Key information appears early on the page.

3. **Schema & Structured Data**  - JSON-LD schema markup present. Schema type is appropriate for the page (Organization, WebPage, Product, Article, FAQ, etc.). Schema is complete (not just the bare minimum fields). Multiple relevant schema types used where appropriate. Schema would help generate rich snippets in search results. FAQ schema present where applicable (great for AI answers).

4. **AI Visibility & Citability**  - This is the star category; be thorough. Content is written in clear, factual, quotable statements (AI models love to cite these). Questions are explicitly asked and answered in the content (Q&A format sections). The site clearly states what the company/product does in plain language within the first few paragraphs. Unique data points, statistics, or claims that AI models would want to reference. Author/company authority signals (about page links, credentials, experience mentioned). Content covers topics comprehensively enough to be a useful source for AI models. Your competitors who optimise for AI search will steal your traffic  - frame findings to create urgency.

5. **Technical SEO Signals**  - Clean, crawlable HTML (not entirely JavaScript-rendered with empty body). Internal links use descriptive anchor text. Images have alt text with relevant descriptions. No broken link patterns visible in the HTML (href="#", empty hrefs). Hreflang tags for multilingual sites. Sitemap and robots.txt referenced or linked.

6. **Content Quality & E-E-A-T**  - Evidence of Experience (case studies, testimonials, real examples). Evidence of Expertise (detailed, accurate content, not generic fluff). Evidence of Authority (links to credentials, publications, awards). Evidence of Trust (privacy policy, terms, contact info, physical address). Content is up to date (copyright dates, "last updated" signals). Unique perspective or original insight (not just rehashed commodity content).

7. **Local & Entity Signals**  - Business name, address, phone (NAP) consistently presented. LocalBusiness or Organization schema with complete details. Google Maps embed or location links where relevant. Service area or location pages if applicable. Social media profile links (helps AI models connect the entity). Consistent brand entity naming throughout the site.

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence overview of the site's SEO and AI visibility>",
  "categories": [
    {
      "name": "Meta & On-Page SEO",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Heading & Content",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Schema & Structured Data",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "AI Visibility",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Technical SEO",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Content Quality & E-E-A-T",
      "score": <number 0-100>,
      "description": "<brief assessment>"
    },
    {
      "name": "Local & Entity Signals",
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

Write like a helpful expert who really understands this stuff  - making the prospect feel they've found the right people. Short sentences. No filler. This is a sales tool  - be encouraging about wins while creating urgency about gaps, especially around AI visibility.

Be specific and reference actual content from the website. Don't just say "meta description could be better"  - say what's wrong and what a good one would look like. Provide 3-4 strengths and 3-4 improvements. Return improvements sorted by priority  - most impactful first.

Scores should be realistic and varied  - don't give everything 60-80. A site with no schema should score very low on Schema & Structured Data. A site with no clear factual statements or Q&A content should score low on AI Visibility.`;

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
