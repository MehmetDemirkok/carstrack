"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { format, parse, isValid } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Tarih seçin",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0, openUpward: false });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const handleOpen = () => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 340 && rect.top > 340;
    setCoords({
      top: openUpward ? rect.top : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUpward,
    });
    setOpen(true);
  };

  const handleSelect = (day: Date | undefined) => {
    onChange(day ? format(day, "yyyy-MM-dd") : "");
    setOpen(false);
  };

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dropdown = open
    ? ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            ...(coords.openUpward
              ? { bottom: window.innerHeight - coords.top + 4 }
              : { top: coords.top }),
            left: coords.left,
            minWidth: Math.max(coords.width, 320),
            zIndex: 9999,
          }}
          className="rounded-xl bg-popover shadow-lg ring-1 ring-foreground/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2035, 11)}
            defaultMonth={selected ?? new Date()}
            locale={tr as Parameters<typeof Calendar>[0]["locale"]}
          />
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl bg-muted/30 border border-border/40 px-3 py-2 text-sm hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:pointer-events-none",
          !selected && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0" />
        {selected ? format(selected, "d MMMM yyyy", { locale: tr }) : placeholder}
      </button>
      {dropdown}
    </>
  );
}
