import ScoreRing from "./ScoreRing";
import type { CategoryScore } from "@/lib/types";

interface CategoryBreakdownProps {
  categories: CategoryScore[];
}

export default function CategoryBreakdown({
  categories,
}: CategoryBreakdownProps) {
  return (
    <section className="py-12">
      <div className="max-w-2xl mx-auto px-6">
        <p className="font-mono text-[0.75rem] leading-[1.5] uppercase tracking-[0.1em] text-ink-muted mb-8 text-center">
          Category breakdown
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-6">
          {categories.map((cat) => (
            <div key={cat.name} className="flex flex-col items-center gap-2">
              <ScoreRing
                score={cat.score}
                size={64}
                strokeWidth={5}
                fontSize="text-base"
              />
              <span className="text-xs text-ink-secondary text-center leading-tight">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
