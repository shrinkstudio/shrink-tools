import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary:
          "text-ink-secondary bg-surface rounded-full px-2.5 py-0.5 text-[0.65rem]",
        outline:
          "font-mono text-[0.65rem] leading-[1.5] tracking-[0.1em] uppercase text-ink-muted border border-border-default rounded px-2 py-0.5",
        destructive:
          "bg-destructive/10 text-destructive font-mono text-[0.65rem] uppercase px-1.5 py-0.5 rounded",
        "impact-high":
          "bg-accent-light text-accent-deep font-mono text-[0.65rem] uppercase px-1.5 py-0.5 rounded",
        "impact-medium":
          "bg-warn-light text-score-warn font-mono text-[0.65rem] uppercase px-1.5 py-0.5 rounded",
        "priority-high":
          "bg-score-bad/10 text-score-bad font-mono text-[0.65rem] uppercase px-1.5 py-0.5 rounded",
        "priority-medium":
          "bg-warn-light text-score-warn font-mono text-[0.65rem] uppercase px-1.5 py-0.5 rounded",
        "priority-low":
          "bg-surface text-ink-muted font-mono text-[0.65rem] uppercase px-1.5 py-0.5 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
