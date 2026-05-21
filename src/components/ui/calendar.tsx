"use client"

import * as React from "react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 select-none", className)}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code ?? "tr-TR", { month: "long" }),
        formatYearDropdown: (date) =>
          date.toLocaleString(locale?.code ?? "tr-TR", { year: "numeric" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn("flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex flex-col gap-3", defaultClassNames.month),

        /* ── Header / Caption ── */
        nav: cn(
          "flex items-center justify-between mb-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex items-center justify-center gap-2",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn("relative", defaultClassNames.dropdown_root),
        dropdown: cn(
          "absolute inset-0 cursor-pointer opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "text-sm font-semibold text-foreground",
          defaultClassNames.caption_label
        ),

        /* ── Grid ── */
        month_grid: "w-full border-collapse",
        weekdays: cn("flex gap-1 mb-1", defaultClassNames.weekdays),
        weekday: cn(
          "flex h-9 w-9 items-center justify-center text-[11px] font-medium text-muted-foreground uppercase tracking-wide",
          defaultClassNames.weekday
        ),
        week: cn("flex gap-1", defaultClassNames.week),
        week_number_header: cn("w-9 select-none", defaultClassNames.week_number_header),
        week_number: cn("text-xs text-muted-foreground", defaultClassNames.week_number),

        /* ── Day cell ── */
        day: cn(
          "relative flex h-9 w-9 items-center justify-center",
          defaultClassNames.day
        ),
        day_button: cn(
          "h-9 w-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          defaultClassNames.day_button
        ),

        /* ── States ── */
        selected: cn(
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90",
          defaultClassNames.selected
        ),
        today: cn(
          "[&>button]:border [&>button]:border-primary/40 [&>button]:text-primary",
          defaultClassNames.today
        ),
        outside: cn(
          "[&>button]:text-muted-foreground/40 [&>button]:opacity-50",
          defaultClassNames.outside
        ),
        disabled: cn(
          "[&>button]:text-muted-foreground/30 [&>button]:cursor-not-allowed",
          defaultClassNames.disabled
        ),
        range_start: cn("[&>button]:rounded-l-lg", defaultClassNames.range_start),
        range_middle: cn(
          "[&>button]:rounded-none [&>button]:bg-accent [&>button]:text-accent-foreground",
          defaultClassNames.range_middle
        ),
        range_end: cn("[&>button]:rounded-r-lg", defaultClassNames.range_end),
        hidden: cn("invisible", defaultClassNames.hidden),

        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left")
            return <ChevronLeft className="h-4 w-4" />
          if (orientation === "right")
            return <ChevronRight className="h-4 w-4" />
          return <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        },
        ...components,
      }}
      {...props}
    />
  )
}

export { Calendar }
