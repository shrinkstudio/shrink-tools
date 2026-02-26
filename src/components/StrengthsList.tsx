import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Strength } from "@/lib/types";

interface StrengthsListProps {
  strengths: Strength[];
}

export default function StrengthsList({ strengths }: StrengthsListProps) {
  return (
    <section className="py-12">
      <div className="max-w-2xl mx-auto px-6">
        <p className="font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] text-ink-muted mb-2">
          What&apos;s working
        </p>
        <h3 className="text-lg font-black text-ink mb-6">The good stuff</h3>
        <div className="space-y-4">
          {strengths.map((strength, i) => (
            <Card key={i} className="p-5">
              <CardContent className="p-0">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-deep flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-ink">
                    {strength.title}
                  </h3>
                  <Badge
                    variant={
                      strength.impact === "HIGH"
                        ? "impact-high"
                        : "impact-medium"
                    }
                  >
                    {strength.impact}
                  </Badge>
                </div>
                <p className="text-ink-secondary text-sm pl-4">
                  {strength.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
