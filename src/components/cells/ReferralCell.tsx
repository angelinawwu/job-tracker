"use client";

import { useEffect, useRef, useState } from "react";
import Popover from "../Popover";

interface ReferralCellProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Icon-only cell, sibling to the link icon. A filled dot means someone
 * referred this application — hovering it reveals who. When empty, the
 * icon stays invisible until hover, at which point a dashed "add" affordance
 * appears so the row doesn't otherwise show an icon for something it lacks.
 */
export default function ReferralCell({ value, onChange }: ReferralCellProps) {
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(value);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [open, value]);

  const commit = (next: string) => {
    const trimmed = next.trim();
    if (trimmed !== value) onChange(trimmed);
  };

  return (
    <div
      className="relative flex h-full items-center justify-center"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={value ? `Referral: ${value}` : "Add referral"}
        className={`pressable grid h-6 w-6 place-items-center rounded-md transition-[opacity,background-color,color] ease-out hover:bg-activebg focus-visible:opacity-100 ${
          value ? "text-accent" : "text-faint"
        } ${value || hovering || open ? "opacity-100" : "opacity-0"}`}
      >
        {value ? (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5.5" r="2.4" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M3.2 13c0-2.4 2.15-3.9 4.8-3.9s4.8 1.5 4.8 3.9"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="5.5" strokeDasharray="2 2.3" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 5.7v4.6M5.7 8h4.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {value && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute -top-1.5 left-1/2 z-10 whitespace-nowrap rounded-md bg-[#26241f] px-2 py-1 text-[11.5px] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-[opacity,transform] ease-out ${
            hovering && !open ? "opacity-100 delay-300" : "opacity-0"
          }`}
          style={{
            transformOrigin: "bottom center",
            transform: `translate(-50%, -100%) scale(${hovering && !open ? 1 : 0.97})`,
          }}
        >
          Referred by {value}
        </div>
      )}

      <Popover
        open={open}
        onClose={() => {
          commit(draft);
          setOpen(false);
        }}
        className="w-[220px] p-2"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(draft);
              setOpen(false);
            }
          }}
          placeholder="Who referred you?"
          className="h-7 w-full rounded-md border border-line bg-hoverbg px-2 text-[13px] placeholder:text-faint focus:border-accent/50 focus:bg-white"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              onChange("");
              setOpen(false);
            }}
            className="mt-1.5 text-[11px] text-faint transition-colors hover:text-red-500"
          >
            Remove referral
          </button>
        )}
      </Popover>
    </div>
  );
}
