"use client";

import Header from "@/components/Header";
import ResultsCard from "@/components/ResultsCard";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import StrengthsList from "@/components/StrengthsList";
import ImprovementsList from "@/components/ImprovementsList";
import Footer from "@/components/Footer";

const MOCK_RESULT = {
  overallScore: 72,
  summary:
    "Stripe demonstrates strong PLG fundamentals with excellent product visibility through comprehensive documentation and clear value proposition, but lacks traditional self-service onboarding with free trials or freemium options.",
  categories: [
    {
      name: "Value Prop",
      score: 85,
      description: "Clear, compelling value proposition.",
    },
    {
      name: "Self-Service",
      score: 55,
      description: "Limited self-service options.",
    },
    {
      name: "Onboarding",
      score: 60,
      description: "Decent onboarding experience.",
    },
    {
      name: "Social Proof",
      score: 82,
      description: "Strong customer logos and stats.",
    },
    {
      name: "CTA Clarity",
      score: 78,
      description: "Clear calls to action throughout.",
    },
    {
      name: "Visibility",
      score: 90,
      description: "Excellent product documentation.",
    },
    {
      name: "Pricing",
      score: 45,
      description: "Pricing could be more transparent.",
    },
  ],
  strengths: [
    {
      title: "Comprehensive Developer Documentation",
      impact: "HIGH" as const,
      description:
        "Stripe's documentation is industry-leading, providing interactive code examples, detailed API references, and quick-start guides that enable developers to integrate without sales assistance.",
    },
    {
      title: "Strong Brand Trust Signals",
      impact: "HIGH" as const,
      description:
        "The homepage prominently features recognizable customer logos including Amazon, Google, and Shopify, establishing immediate credibility and trust.",
    },
    {
      title: "Clear Value Proposition",
      impact: "MEDIUM" as const,
      description:
        "The headline 'Financial infrastructure to grow your revenue' immediately communicates what Stripe does and the benefit to users.",
    },
  ],
  improvements: [
    {
      title: "No Free Trial or Freemium Tier",
      priority: "MEDIUM" as const,
      description:
        "There is no visible free trial or freemium option on the homepage. Users must contact sales or sign up without understanding pricing implications.",
      recommendation:
        "Add a prominent free tier or sandbox environment that lets developers explore the platform before committing to paid plans.",
    },
    {
      title: "Pricing Transparency",
      priority: "MEDIUM" as const,
      description:
        "While pricing exists on a dedicated page, the homepage doesn't surface any pricing information, creating uncertainty for cost-conscious prospects.",
      recommendation:
        "Add a pricing summary or 'starts at' indicator on the homepage to set expectations early in the evaluation process.",
    },
    {
      title: "Limited Product Screenshots",
      priority: "LOW" as const,
      description:
        "The homepage relies heavily on code snippets and text rather than showing the actual dashboard or management interface.",
      recommendation:
        "Include interactive product tours or screenshots of the Stripe Dashboard to give non-technical stakeholders a visual understanding of the product.",
    },
  ],
};

export default function PreviewResults() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <ResultsCard
          result={MOCK_RESULT}
          analyzedUrl="stripe.com"
          onAnalyzeAnother={() => {}}
        />
        <CategoryBreakdown categories={MOCK_RESULT.categories} />
        <StrengthsList strengths={MOCK_RESULT.strengths} />
        <ImprovementsList improvements={MOCK_RESULT.improvements} />
      </main>
      <Footer />
    </div>
  );
}
