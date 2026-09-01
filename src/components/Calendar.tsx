"use client";

import { useState } from "react";
import { todayISO } from "@/lib/types";

interface CalendarProps {
  value: string; // ISO date yyyy-mm-dd
  onSelect: (iso: string) => void;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseISO(iso: string): { y: number; m: number; d: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function Calendar({ value, onSelect }: CalendarProps) {
  const selected = parseISO(value);
  const today = parseISO(todayISO())!;
  const [view, setView] = useState(() => ({
    y: selected?.y ?? today.y,
    m: selected?.m ?? today.m,
  }));

  const firstDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const step = (delta: number) => {
    setView(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  };

  return (
    <div className="w-[248px] select-none p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[13px] font-medium">
          {MONTHS[view.m]} {view.y}
        </span>
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => step(-1)}
            className="pressable grid h-6 w-6 place-items-center rounded text-muted hover:bg-hoverbg"
            aria-label="Previous month"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            className="pressable grid h-6 w-6 place-items-center rounded text-muted hover:bg-hoverbg"
            aria-label="Next month"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-[11px] font-medium text-faint">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const iso = toISO(view.y, view.m, day);
          const isSelected = value === iso;
          const isToday =
            today.y === view.y && today.m === view.m && today.d === day;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`pressable mx-auto grid h-7 w-7 place-items-center rounded-md text-[12.5px] transition-colors ${
                isSelected
                  ? "bg-accent font-medium text-white"
                  : isToday
                    ? "font-semibold text-accent hover:bg-hoverbg"
                    : "hover:bg-hoverbg"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onSelect(todayISO())}
        className="pressable mt-2 w-full rounded-md border border-line py-1 text-[12px] text-muted transition-colors hover:bg-hoverbg"
      >
        Today
      </button>
    </div>
  );
}
