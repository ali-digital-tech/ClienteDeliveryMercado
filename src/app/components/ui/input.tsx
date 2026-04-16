import * as React from "react";

import { cn } from "./utils";

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-xl border border-[#d9e4f2] bg-white px-3 py-2 text-sm text-[#334155] outline-none transition-[color,box-shadow,border-color]",
        "placeholder:text-[#94a3b8]",
        "selection:bg-[#122a4c] selection:text-white",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#122a4c]",
        "focus-visible:border-[#122a4c] focus-visible:ring-[3px] focus-visible:ring-[#122a4c]/20",
        "aria-invalid:border-red-300 aria-invalid:ring-red-200",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };