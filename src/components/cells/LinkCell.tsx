"use client";

import { useEffect, useRef, useState } from "react";
import Popover from "../Popover";

interface LinkCellProps {
  value: string;
  onChange: (url: string) => void;
  /** Called with metadata scraped from the pasted link. */
  onMetadata: (meta: { company: string; jobTitle: string }) => void;
}

export default function LinkCell({ value, onChange, onMetadata }: LinkCellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [fetching, setFetching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(value);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [open, value]);

  const fetchMetadata = async (url: string) => {
    setFetching(true);
    try {
      const res = await fetch("/api/link-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const meta = await res.json();
        if (meta.company || meta.jobTitle) onMetadata(meta);
      }
    } finally {
      setFetching(false);
    }
  };

  const commit = (url: string, autofill: boolean) => {
    const trimmed = url.trim();
    if (trimmed !== value) {
      onChange(trimmed);
      if (autofill && /^https?:\/\//i.test(trimmed)) void fetchMetadata(trimmed);
    }
  };

  return (
    <div className="relative flex h-full items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={value || "Add link"}
        aria-label={value ? `Link: ${value}` : "Add link"}
        className={`pressable group grid h-6 w-6 place-items-center rounded-md transition-colors hover:bg-activebg ${
          value ? "text-accent" : "text-faint opacity-40 hover:opacity-100"
        }`}
      >
        {fetching ? (
          <svg className="animate-spin" width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
            <path d="M12.5 7A5.5 5.5 0 0 0 7 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path
              d="M6.5 9.5l3-3M7.25 4.75l1.1-1.1a2.62 2.62 0 013.7 3.7l-1.1 1.1M8.75 11.25l-1.1 1.1a2.62 2.62 0 01-3.7-3.7l1.1-1.1"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} className="w-[320px] p-2">
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text").trim();
              if (/^https?:\/\//i.test(pasted)) {
                e.preventDefault();
                setDraft(pasted);
                commit(pasted, true);
                setOpen(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit(draft, true);
                setOpen(false);
              }
            }}
            placeholder="Paste job posting URL…"
            className="h-7 flex-1 rounded-md border border-line bg-hoverbg px-2 text-[13px] placeholder:text-faint focus:border-accent/50 focus:bg-white"
          />
          {value && (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-hoverbg hover:text-accent"
              title="Open link"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6.5 3.5H4a1.5 1.5 0 00-1.5 1.5v7A1.5 1.5 0 004 13.5h7A1.5 1.5 0 0012.5 12V9.5M9.5 2.5h4v4M13 3l-5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          )}
        </div>
        {value && (
          <p className="mt-1.5 truncate px-0.5 text-[11.5px] text-faint" title={value}>
            {value}
          </p>
        )}
        <p className="mt-1.5 px-0.5 text-[11px] text-faint">
          Pasting a link autofills company &amp; job title
        </p>
      </Popover>
    </div>
  );
}
