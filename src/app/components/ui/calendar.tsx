"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rounded-2xl border border-[#d9e4f2] bg-white p-3",
        className,
      )}
      classNames={{
        months: "flex flex-col gap-2 sm:flex-row",
        month: "flex flex-col gap-4",
        caption:
          "relative flex w-full items-center justify-center pt-1",
        caption_label: "text-sm font-semibold text-[#122a4c]",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-8 rounded-xl border-[#d9e4f2] bg-white p-0 text-[#122a4c] opacity-100 hover:bg-[#eef4fb]",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "w-9 rounded-md text-[0.8rem] font-medium text-[#94a3b8]",
        row: "mt-2 flex w-full",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-xl [&:has(>.day-range-start)]:rounded-l-xl first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl"
            : "[&:has([aria-selected])]:rounded-xl",
        ),
        day: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-9 rounded-xl p-0 font-normal text-[#334155] aria-selected:opacity-100 hover:bg-[#eef4fb] hover:text-[#122a4c]",
        ),
        day_range_start:
          "day-range-start bg-[#122a4c] text-white hover:bg-[#122a4c] hover:text-white",
        day_range_end:
          "day-range-end bg-[#122a4c] text-white hover:bg-[#122a4c] hover:text-white",
        day_selected:
          "bg-[#122a4c] text-white hover:bg-[#1b3d6d] hover:text-white focus:bg-[#122a4c] focus:text-white",
        day_today:
          "border border-[#d9e4f2] bg-[#eef4fb] font-semibold text-[#122a4c]",
        day_outside:
          "day-outside text-[#94a3b8] opacity-60 aria-selected:bg-[#eef4fb] aria-selected:text-[#94a3b8]",
        day_disabled: "text-[#cbd5e1] opacity-50",
        day_range_middle:
          "aria-selected:bg-[#eef4fb] aria-selected:text-[#122a4c]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft
            className={cn("size-4", className)}
            {...props}
          />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight
            className={cn("size-4", className)}
            {...props}
          />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };