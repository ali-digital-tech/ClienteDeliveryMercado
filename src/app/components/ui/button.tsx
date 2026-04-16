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
          "bg-[#122a4c] text-white hover:bg-[#1b3d6d] focus-visible:ring-[#122a4c]/20",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200",
        outline:
          "border border-[#d9e4f2] bg-white text-[#122a4c] hover:bg-[#eef4fb] hover:text-[#122a4c] focus-visible:ring-[#122a4c]/20",
        secondary:
          "bg-[#eef4fb] text-[#122a4c] hover:bg-[#e3edf9] focus-visible:ring-[#122a4c]/20",
        ghost:
          "text-[#122a4c] hover:bg-[#eef4fb] hover:text-[#122a4c] focus-visible:ring-[#122a4c]/20",
        link: "text-[#122a4c] underline-offset-4 hover:underline focus-visible:ring-[#122a4c]/20",
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