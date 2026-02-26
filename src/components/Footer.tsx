import { Separator } from "@/components/ui/separator";

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "https://shrink.studio/legals/privacy-policy" },
  { label: "Terms of Use", href: "https://shrink.studio/legals/terms-of-use" },
  { label: "Cookie Policy", href: "https://shrink.studio/legals/cookies-policy" },
  { label: "Acceptable Use", href: "https://shrink.studio/legals/acceptable-use" },
  { label: "Sustainability", href: "https://shrink.studio/legals/sustainability" },
  { label: "Modern Slavery", href: "https://shrink.studio/legals/modern-slavery" },
];

export default function Footer() {
  return (
    <footer>
      <Separator />
      <div className="py-8 max-w-2xl mx-auto px-6 text-center space-y-3">
        <p className="font-mono text-[0.75rem] leading-[1.5] tracking-[0.1em] uppercase text-ink-muted">
          Built by{" "}
          <a
            href="https://shrink.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-secondary hover:text-ink transition-colors"
          >
            Shrink Studio
          </a>
          {" "}&middot;{" "}
          <a
            href="https://shrink.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-secondary hover:text-ink transition-colors"
          >
            shrink.studio
          </a>
        </p>
        <p className="text-xs text-ink-muted">
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.href}>
              {i > 0 && " \u00B7 "}
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {link.label}
              </a>
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
