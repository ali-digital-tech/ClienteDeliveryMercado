"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "./utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        "data-[disabled]:opacity-50",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44",
        "data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full bg-[var(--market-primary-soft-color)]",
          "data-[orientation=horizontal]:h-3 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-[var(--market-primary-color)]",
            "data-[orientation=horizontal]:h-full",
            "data-[orientation=vertical]:w-full",
          )}
        />
      </SliderPrimitive.Track>

      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            "block size-5 shrink-0 rounded-full border-2 border-[var(--market-primary-color)] bg-white shadow-sm outline-none transition-[box-shadow,transform]",
            "hover:ring-4 hover:ring-[var(--market-primary-color)]/15",
            "focus-visible:ring-4 focus-visible:ring-[var(--market-primary-color)]/20",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };