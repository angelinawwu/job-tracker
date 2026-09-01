"use client";

import { useState } from "react";
import Calendar from "../Calendar";
import Popover from "../Popover";

interface DateCellProps {
  value: string;
  onChange: (iso: string) => void;
}

function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
}

export default function DateCell({ value, onChange }: DateCellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-full w-full items-center px-2 text-left text-[13px] tabular-nums transition-colors hover:bg-hoverbg"
      >
        {value ? formatDate(value) : <span className="text-faint">—</span>}
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        <Calendar
          value={value}
          onSelect={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      </Popover>
    </div>
  );
}
