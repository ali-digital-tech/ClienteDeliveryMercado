import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--market-primary-color)] text-white hover:bg-[var(--market-secondary-color)] focus-visible:ring-[var(--market-primary-color)]/20",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200",
        outline:
          "border border-[var(--market-primary-border-color)] bg-white text-[var(--market-primary-color)] hover:bg-[var(--market-primary-soft-color)] hover:text-[var(--market-primary-color)] focus-visible:ring-[var(--market-primary-color)]/20",
        secondary:
          "bg-[var(--market-primary-soft-color)] text-[var(--market-primary-color)] hover:bg-[var(--market-primary-soft-color)] focus-visible:ring-[var(--market-primary-color)]/20",
        ghost:
          "text-[var(--market-primary-color)] hover:bg-[var(--market-primary-soft-color)] hover:text-[var(--market-primary-color)] focus-visible:ring-[var(--market-primary-color)]/20",
        link: "text-[var(--market-primary-color)] underline-offset-4 hover:underline focus-visible:ring-[var(--market-primary-color)]/20",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-6 rounded-xl has-[>svg]:px-4",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        className,
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants };