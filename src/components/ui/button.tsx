import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9927d] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#49111c] text-[#f2f4f3] hover:bg-[#631726] shadow-lg shadow-[#49111c]/30 border border-[#a9927d]/30",
        destructive:
          "bg-red-900/80 text-[#f2f4f3] hover:bg-red-800 border border-red-700/50 shadow-md",
        outline:
          "border border-[#a9927d]/30 bg-[#0a0908]/60 text-[#f2f4f3] hover:bg-[#49111c]/30 hover:border-[#a9927d]/60 backdrop-blur-md",
        secondary:
          "bg-[#5e503f]/50 text-[#f2f4f3] hover:bg-[#5e503f]/80 border border-[#a9927d]/20",
        ghost: "hover:bg-[#49111c]/20 hover:text-[#f2f4f3]",
        link: "text-[#a9927d] underline-offset-4 hover:underline",
        liquid: "bg-gradient-to-r from-[#49111c] to-[#5e503f] text-[#f2f4f3] border border-[#a9927d]/40 shadow-xl shadow-[#49111c]/20 hover:brightness-110",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
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
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
