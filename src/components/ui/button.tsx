import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-[0_4px_0_0_hsl(var(--primary)/0.3)] active:shadow-[0_2px_0_0_hsl(var(--primary)/0.3)] active:translate-y-[2px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 border-t-2 border-t-primary-foreground/20 border-b-2 border-b-primary/60",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_4px_0_0_hsl(var(--destructive)/0.3)] active:shadow-[0_2px_0_0_hsl(var(--destructive)/0.3)] border-t-2 border-t-destructive-foreground/20 border-b-2 border-b-destructive/60",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-[0_3px_0_0_hsl(var(--border))] active:shadow-[0_1px_0_0_hsl(var(--border))]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[0_4px_0_0_hsl(var(--secondary)/0.3)] active:shadow-[0_2px_0_0_hsl(var(--secondary)/0.3)] border-t-2 border-t-secondary-foreground/20 border-b-2 border-b-secondary/60",
        ghost: "hover:bg-accent hover:text-accent-foreground shadow-none active:shadow-none active:translate-y-0",
        link: "text-primary underline-offset-4 hover:underline shadow-none active:shadow-none active:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
