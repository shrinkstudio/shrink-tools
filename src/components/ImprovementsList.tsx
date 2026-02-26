import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Improvement } from "@/lib/types";

interface ImprovementsListProps {
  improvements: Improvement[];
}

export default function ImprovementsList({
  improvements,
}: ImprovementsListProps) {
  return (
    <section className="py-12 pb-20">
      <div className="max-w-2xl mx-auto px-6">
        <p className="font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] text-ink-muted mb-2">
          Where you&apos;re leaving money on the table
        </p>
        <h3 className="text-lg font-black text-ink mb-6">Room to grow</h3>
        <div className="space-y-4">
          {improvements.map((improvement, i) => (
            <Card key={i} className="p-5">
              <CardContent className="p-0">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-score-warn flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-ink">
                    {improvement.title}
                  </h3>
                  <Badge
                    variant={
                      improvement.priority === "HIGH"
                        ? "priority-high"
                        : improvement.priority === "MEDIUM"
                          ? "priority-medium"
                          : "priority-low"
                    }
                  >
                    {improvement.priority}
                  </Badge>
                </div>
                <p className="text-ink-secondary text-sm mb-3 pl-4">
                  {improvement.description}
                </p>
                <div className="bg-surface rounded-md px-4 py-3 ml-4">
                  <p className="text-ink-secondary text-sm">
                    <span className="text-ink font-medium">&rarr;</span>{" "}
                    {improvement.recommendation}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
