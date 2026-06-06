import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-[color,background-color,border-color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:outline-none focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--market-primary-color)] text-white hover:bg-[var(--market-secondary-color)] focus-visible:ring-[var(--market-primary-color)]/20",
        secondary:
          "border-transparent bg-[var(--market-primary-soft-color)] text-[var(--market-primary-color)] hover:bg-[var(--market-primary-soft-color)] focus-visible:ring-[var(--market-primary-color)]/20",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200",
        outline:
          "border-[var(--market-primary-border-color)] bg-white text-[var(--market-primary-color)] hover:bg-[var(--market-primary-soft-color)] focus-visible:ring-[var(--market-primary-color)]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };