"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TAGS, tagStyle } from "@/lib/tags";
import Popover from "../Popover";

interface MaterialsCellProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Custom tags used elsewhere in the tracker, for suggestions. */
  allTags: string[];
}

function Pill({ name, onRemove }: { name: string; onRemove?: () => void }) {
  const s = tagStyle(name);
  return (
    <span
      className="inline-flex h-[18px] max-w-full items-center gap-1 rounded px-1.5 text-[11.5px] font-medium leading-none"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="grid h-3 w-3 shrink-0 place-items-center rounded-sm opacity-50 transition-opacity hover:opacity-100"
          aria-label={`Remove ${name}`}
        >
          <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
            <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}

export default function MaterialsCell({ value, onChange, allTags }: MaterialsCellProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Canonical order in which tags are listed in the selector (defaults
  // first, then any custom tags in the order they were introduced).
  // Selected tags are always sorted to match this order, regardless of
  // the order the user picked them in.
  const allOptions = useMemo(
    () => Array.from(new Set([...Object.keys(DEFAULT_TAGS), ...allTags])),
    [allTags]
  );

  const sortTags = (tags: string[]) =>
    [...tags].sort((a, b) => {
      const ia = allOptions.indexOf(a);
      const ib = allOptions.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

  const sortedValue = sortTags(value);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allOptions.filter((t) => !q || t.toLowerCase().includes(q));
  }, [allOptions, query]);

  const trimmed = query.trim();
  const exactExists = options.some((t) => t.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length > 0 && !exactExists;

  const toggle = (tag: string) => {
    onChange(
      sortTags(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag])
    );
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-full w-full flex-wrap content-center items-center gap-1 overflow-hidden px-2 py-1 text-left transition-colors hover:bg-hoverbg"
      >
        {sortedValue.length > 0 ? (
          sortedValue.map((t) => <Pill key={t} name={t} />)
        ) : (
          <span className="text-[13px] text-faint">Empty</span>
        )}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} className="w-[240px]">
        <div className="flex flex-wrap items-center gap-1 border-b border-line bg-hoverbg p-1.5">
          {sortedValue.map((t) => (
            <Pill key={t} name={t} onRemove={() => onChange(value.filter((v) => v !== t))} />
          ))}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (showCreate) toggle(trimmed);
                else if (options[0]) toggle(options[0]);
              }
              if (e.key === "Backspace" && query === "" && value.length > 0) {
                onChange(value.slice(0, -1));
              }
            }}
            placeholder={value.length === 0 ? "Search or create…" : ""}
            className="h-[18px] min-w-[70px] flex-1 bg-transparent text-[12.5px] placeholder:text-faint"
          />
        </div>
        <div className="thin-scroll max-h-[190px] overflow-y-auto p-1">
          <p className="px-1.5 pb-1 pt-0.5 text-[11px] font-medium text-faint">
            Select or create a tag
          </p>
          {options.map((tag) => {
            const s = tagStyle(tag);
            const selected = value.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-[5px] text-left transition-colors hover:bg-hoverbg"
              >
                <span
                  className="inline-flex h-[18px] items-center rounded px-1.5 text-[11.5px] font-medium leading-none"
                  style={{ backgroundColor: s.bg, color: s.text }}
                >
                  {tag}
                </span>
                {selected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-muted">
                    <path d="M2.5 6.5L5 9l4.5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
          {showCreate && (
            <button
              type="button"
              onClick={() => toggle(trimmed)}
              className="flex w-full items-center gap-1.5 rounded px-1.5 py-[5px] text-left text-[12.5px] text-muted transition-colors hover:bg-hoverbg"
            >
              <span>Create</span>
              <Pill name={trimmed} />
            </button>
          )}
          {options.length === 0 && !showCreate && (
            <p className="px-1.5 py-1 text-[12px] text-faint">No tags found</p>
          )}
        </div>
      </Popover>
    </div>
  );
}
