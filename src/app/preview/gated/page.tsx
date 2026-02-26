"use client";

import Header from "@/components/Header";
import EmailGate from "@/components/EmailGate";
import Footer from "@/components/Footer";

const MOCK_RESULT = {
  overallScore: 72,
  summary:
    "Stripe demonstrates strong PLG fundamentals with excellent product visibility through comprehensive documentation and clear value proposition, but lacks traditional self-service onboarding with free trials or freemium options.",
  categories: [
    { name: "Value Prop", score: 85, description: "" },
    { name: "Self-Service", score: 55, description: "" },
    { name: "Onboarding", score: 60, description: "" },
    { name: "Social Proof", score: 82, description: "" },
    { name: "CTA Clarity", score: 78, description: "" },
    { name: "Visibility", score: 90, description: "" },
    { name: "Pricing", score: 45, description: "" },
  ],
  strengths: [],
  improvements: [],
};

export default function PreviewGated() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <EmailGate
          result={MOCK_RESULT}
          analyzedUrl="stripe.com"
          onUnlock={() => {}}
          reportId={null}
        />
      </main>
      <Footer />
    </div>
  );
}
