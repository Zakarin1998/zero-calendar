import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "btn-primary",
        destructive: "btn-destructive",
        outline: "btn-outline",
        secondary: "btn-secondary",
        ghost: "btn-ghost",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "btn-accent",
        subtle:
          "bg-mono-100 text-mono-800 hover:bg-mono-200 dark:bg-mono-800 dark:text-mono-200 dark:hover:bg-mono-700",
        glass: "glass glass-hover text-mono-900 dark:text-mono-50",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
        xl: "h-12 rounded-lg px-10 text-base",
        "2xl": "h-14 rounded-lg px-12 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {props.children}
        <span className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden">
          <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </span>
      </Comp>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
