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
          "border-transparent bg-[#122a4c] text-white hover:bg-[#1b3d6d] focus-visible:ring-[#122a4c]/20",
        secondary:
          "border-transparent bg-[#eef4fb] text-[#122a4c] hover:bg-[#e3edf9] focus-visible:ring-[#122a4c]/20",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200",
        outline:
          "border-[#d9e4f2] bg-white text-[#122a4c] hover:bg-[#eef4fb] focus-visible:ring-[#122a4c]/20",
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