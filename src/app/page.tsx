import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TOOLS = [
  {
    name: "PLG Readiness Analyser",
    description:
      "Find out if your website is actually built for product-led growth.",
    href: "/plg-readiness",
    status: "live" as const,
    tags: ["Growth", "Conversion"],
  },
  {
    name: "Accessibility Checker",
    description:
      "Audit your site against WCAG standards and get actionable fixes.",
    href: "/accessibility",
    status: "live" as const,
    tags: ["Accessibility", "Compliance"],
  },
  {
    name: "Structure & Scaffolding Checker",
    description:
      "Evaluate your site architecture, navigation and content hierarchy.",
    href: "/structure",
    status: "live" as const,
    tags: ["Architecture", "UX"],
  },
  {
    name: "SEO & AEO Visibility Checker",
    description:
      "Check how visible your site is to search engines and AI assistants.",
    href: "/seo-aeo",
    status: "live" as const,
    tags: ["SEO", "AI Visibility"],
  },
];

export default function ToolsLanding() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-2xl mx-auto px-6 pt-20 pb-12 text-center">
          <p className="font-mono text-[0.75rem] leading-[1.5] tracking-[0.1em] uppercase text-ink-secondary mb-4">
            Free Tools
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-ink mb-4">
            Website audit tools
          </h1>
          <p className="text-lg text-ink-secondary max-w-md mx-auto">
            AI-powered audits that tell you what&apos;s working and what to fix.
            Free, fast, no sign-up required.
          </p>
        </section>

        {/* Tool cards */}
        <section className="max-w-2xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOOLS.map((tool) => {
              const isLive = tool.status === "live";

              const card = (
                <div
                  key={tool.name}
                  className={`relative border border-border-default rounded-lg p-6 h-full flex flex-col ${
                    isLive
                      ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      : "opacity-50"
                  }`}
                >
                  {/* Status badge */}
                  <span
                    className={`absolute top-4 right-4 font-mono text-[0.65rem] leading-[1.5] tracking-[0.1em] uppercase ${
                      isLive ? "text-ink-secondary" : "text-ink-muted"
                    }`}
                  >
                    {isLive ? "Live" : "Coming Soon"}
                  </span>

                  {/* Content */}
                  <h2 className="text-lg font-semibold text-ink pr-20 mb-2">
                    {tool.name}
                  </h2>
                  <p className="text-sm text-ink-secondary mb-4 flex-1">
                    {tool.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {tool.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[0.65rem] leading-[1.5] tracking-[0.1em] uppercase text-ink-muted border border-border-default rounded px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );

              if (isLive) {
                return (
                  <a key={tool.name} href={tool.href} className="block">
                    {card}
                  </a>
                );
              }

              return card;
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
