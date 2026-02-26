import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full px-3.5 py-2.5 border border-border-strong rounded-lg text-sm text-ink bg-white placeholder:text-ink-muted focus:outline-none focus:border-ink transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
