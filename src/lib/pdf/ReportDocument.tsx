import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Font,
} from "@react-pdf/renderer";
import path from "path";

// Register PP Neue Montreal fonts (TTF required for react-pdf)
const fontsDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "NeueMontreal",
  fonts: [
    { src: path.join(fontsDir, "PPNeueMontreal-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontsDir, "PPNeueMontreal-Medium.ttf"), fontWeight: 500 },
    { src: path.join(fontsDir, "PPNeueMontreal-Bold.ttf"), fontWeight: 700 },
  ],
});

Font.register({
  family: "NeueMontrealMono",
  src: path.join(fontsDir, "PPNeueMontrealMono-Regular.ttf"),
});

// Disable hyphenation
Font.registerHyphenationCallback((word) => [word]);

// Brand colours from globals.css
const C = {
  ink: "#0a0a0a",
  inkSecondary: "#737373",
  inkMuted: "#a3a3a3",
  border: "#eaeaea",
  borderStrong: "#d4d4d4",
  bg: "#ffffff",
  surface: "#f7f7f5",
  accent: "#30ffab",
  accentDeep: "#229980",
  scoreGood: "#229980",
  scoreWarn: "#d97706",
  scoreBad: "#dc2626",
};

function scoreColor(score: number) {
  if (score >= 70) return C.scoreGood;
  if (score >= 45) return C.scoreWarn;
  return C.scoreBad;
}

function priorityColor(priority: string) {
  const p = priority.toUpperCase();
  if (p === "HIGH") return C.scoreBad;
  if (p === "MEDIUM") return C.scoreWarn;
  return C.inkMuted;
}

function impactColor(impact: string) {
  return impact.toUpperCase() === "HIGH" ? C.scoreGood : "#2563eb";
}

/** Strip em dashes, en dashes, and replace with hyphens */
function clean(text: string): string {
  return text.replace(/[\u2013\u2014]/g, "-");
}

const s = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "NeueMontreal",
    fontWeight: 400,
    fontSize: 9.5,
    color: C.ink,
    backgroundColor: C.bg,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  brandName: {
    fontSize: 9,
    fontFamily: "NeueMontrealMono",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: C.inkMuted,
  },
  dateLine: {
    fontSize: 8,
    fontFamily: "NeueMontrealMono",
    color: C.inkMuted,
    textAlign: "right",
  },

  // Title block
  titleBlock: {
    marginBottom: 20,
  },
  toolLabel: {
    fontSize: 8,
    fontFamily: "NeueMontrealMono",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.inkMuted,
    marginBottom: 8,
  },
  siteName: {
    fontSize: 24,
    fontWeight: 700,
    color: C.ink,
    marginBottom: 4,
  },
  siteUrl: {
    fontSize: 9,
    color: C.inkSecondary,
  },

  // Score block
  scoreBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    padding: 20,
    backgroundColor: C.surface,
    borderRadius: 4,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 700,
    marginRight: 4,
  },
  scoreMax: {
    fontSize: 18,
    fontWeight: 400,
    color: C.inkMuted,
    marginRight: 20,
  },
  summary: {
    fontSize: 9.5,
    lineHeight: 1.65,
    color: C.inkSecondary,
    flex: 1,
  },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 14,
    marginTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    color: C.ink,
  },

  // Category row
  catRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  catName: {
    width: 105,
    fontSize: 9,
    fontWeight: 500,
  },
  catScore: {
    width: 32,
    fontSize: 9,
    fontWeight: 700,
    textAlign: "right",
    marginRight: 10,
  },
  catBar: {
    width: 72,
    height: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 2.5,
    marginRight: 12,
    marginTop: 3,
  },
  catBarFill: {
    height: 5,
    borderRadius: 2.5,
  },
  catDesc: {
    flex: 1,
    fontSize: 8.5,
    color: C.inkSecondary,
    lineHeight: 1.55,
  },

  // Items (strengths / improvements)
  itemBlock: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    flex: 1,
    color: C.ink,
  },
  badge: {
    fontSize: 6.5,
    fontWeight: 500,
    fontFamily: "NeueMontrealMono",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 2,
    color: C.bg,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  itemDesc: {
    fontSize: 8.5,
    color: C.inkSecondary,
    lineHeight: 1.6,
    marginTop: 3,
  },
  recLabel: {
    fontSize: 7.5,
    fontFamily: "NeueMontrealMono",
    fontWeight: 400,
    color: C.ink,
    marginTop: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  recText: {
    fontSize: 8.5,
    color: C.inkSecondary,
    lineHeight: 1.6,
    marginTop: 3,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    fontFamily: "NeueMontrealMono",
    color: C.inkMuted,
  },
  footerLink: {
    fontSize: 7,
    color: C.inkSecondary,
    textDecoration: "none",
  },
});

interface ReportDocumentProps {
  siteName: string;
  url: string;
  tool: string;
  overallScore: number;
  summary: string;
  categories: { name: string; score: number; description: string }[];
  strengths: { title: string; impact: string; description: string }[];
  improvements: {
    title: string;
    priority: string;
    description: string;
    recommendation: string;
  }[];
  createdAt: string;
  reportUrl: string;
}

export function ReportDocument({
  siteName,
  url,
  tool,
  overallScore,
  summary,
  categories,
  strengths,
  improvements,
  createdAt,
  reportUrl,
}: ReportDocumentProps) {
  const date = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`${tool} Report: ${siteName}`}
      author="Shrink Studio"
      subject={`${tool} assessment for ${siteName}`}
    >
      {/* Page 1: Score + Categories */}
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <Text style={s.brandName}>Shrink Studio</Text>
          <Text style={s.dateLine}>{date}</Text>
        </View>

        <View style={s.titleBlock}>
          <Text style={s.toolLabel}>{tool} Report</Text>
          <Text style={s.siteName}>{clean(siteName)}</Text>
          <Text style={s.siteUrl}>{url}</Text>
        </View>

        <View style={s.scoreBlock}>
          <Text style={[s.scoreNumber, { color: scoreColor(overallScore) }]}>
            {overallScore}
          </Text>
          <Text style={s.scoreMax}>/100</Text>
          <Text style={s.summary}>{clean(summary)}</Text>
        </View>

        <Text style={s.sectionTitle}>Category Breakdown</Text>
        {categories.map((cat) => (
          <View key={cat.name} style={s.catRow}>
            <Text style={s.catName}>{clean(cat.name)}</Text>
            <Text style={[s.catScore, { color: scoreColor(cat.score) }]}>
              {cat.score}
            </Text>
            <View style={s.catBar}>
              <View
                style={[
                  s.catBarFill,
                  {
                    width: `${cat.score}%`,
                    backgroundColor: scoreColor(cat.score),
                  },
                ]}
              />
            </View>
            <Text style={s.catDesc}>{clean(cat.description)}</Text>
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>shrink.studio</Text>
          <Link style={s.footerLink} src={reportUrl}>
            View full report online
          </Link>
        </View>
      </Page>

      {/* Page 2: Strengths */}
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <Text style={s.brandName}>Shrink Studio</Text>
          <Text style={s.dateLine}>
            {clean(tool)} / {clean(siteName)}
          </Text>
        </View>

        <Text style={s.sectionTitle}>What You're Doing Well</Text>
        {strengths.map((item, i) => (
          <View key={i} style={s.itemBlock} wrap={false}>
            <View style={s.itemHeader}>
              <Text style={s.itemTitle}>{clean(item.title)}</Text>
              <Text
                style={[
                  s.badge,
                  { backgroundColor: impactColor(item.impact) },
                ]}
              >
                {item.impact} impact
              </Text>
            </View>
            <Text style={s.itemDesc}>{clean(item.description)}</Text>
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>shrink.studio</Text>
          <Link style={s.footerLink} src={reportUrl}>
            View full report online
          </Link>
        </View>
      </Page>

      {/* Page 3: Improvements */}
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <Text style={s.brandName}>Shrink Studio</Text>
          <Text style={s.dateLine}>
            {clean(tool)} / {clean(siteName)}
          </Text>
        </View>

        <Text style={s.sectionTitle}>Priority Improvements</Text>
        {improvements.map((item, i) => (
          <View key={i} style={s.itemBlock} wrap={false}>
            <View style={s.itemHeader}>
              <Text style={s.itemTitle}>{clean(item.title)}</Text>
              <Text
                style={[
                  s.badge,
                  { backgroundColor: priorityColor(item.priority) },
                ]}
              >
                {item.priority}
              </Text>
            </View>
            <Text style={s.itemDesc}>{clean(item.description)}</Text>
            <Text style={s.recLabel}>Recommendation</Text>
            <Text style={s.recText}>{clean(item.recommendation)}</Text>
          </View>
        ))}

        {/* CTA */}
        <View
          style={{
            marginTop: 20,
            padding: 20,
            backgroundColor: C.surface,
            borderRadius: 4,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 6,
              color: C.ink,
            }}
          >
            Ready to fix these?
          </Text>
          <Text
            style={{
              fontSize: 9,
              color: C.inkSecondary,
              textAlign: "center",
              lineHeight: 1.65,
              marginBottom: 10,
            }}
          >
            We help venture-backed B2B teams evolve their website at the exact
            moment funding changes what's expected of them.
          </Text>
          <Link
            src="https://cal.com/shrinkstudio/30min"
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: C.ink,
              textDecoration: "underline",
            }}
          >
            Book a 30-minute strategy call
          </Link>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>shrink.studio</Text>
          <Link style={s.footerLink} src={reportUrl}>
            View full report online
          </Link>
        </View>
      </Page>
    </Document>
  );
}
