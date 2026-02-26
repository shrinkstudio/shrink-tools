import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-mono text-[0.75rem] leading-[1.5] font-medium uppercase tracking-[0.1em] transition-opacity duration-300 ease-in-out disabled:pointer-events-none disabled:opacity-30 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border border-transparent hover:opacity-50",
        destructive:
          "bg-destructive text-white border border-transparent hover:opacity-50",
        outline:
          "border border-border-strong text-foreground bg-transparent hover:opacity-50",
        secondary:
          "bg-secondary text-secondary-foreground border border-transparent hover:opacity-50",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline tracking-normal font-sans normal-case text-sm",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-11 rounded-lg px-6 py-3",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
