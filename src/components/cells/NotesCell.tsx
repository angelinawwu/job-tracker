"use client";

import { useEffect, useRef, useState } from "react";
import Popover from "../Popover";

interface NotesCellProps {
  value: string;
  onChange: (value: string) => void;
}

export default function NotesCell({ value, onChange }: NotesCellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(value);
      requestAnimationFrame(() => {
        ref.current?.focus();
        ref.current?.setSelectionRange(value.length, value.length);
      });
    }
  }, [open, value]);

  const commit = () => {
    if (draft !== value) onChange(draft);
  };

  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-full w-full items-center px-2 text-left transition-colors hover:bg-hoverbg"
      >
        <span className="truncate text-[13px]">
          {value || <span className="text-faint">Empty</span>}
        </span>
      </button>
      <Popover
        open={open}
        onClose={() => {
          commit();
          setOpen(false);
        }}
        align="right"
        className="w-[300px] p-2"
      >
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              commit();
              setOpen(false);
            }
          }}
          placeholder="Add notes…"
          rows={5}
          className="w-full resize-none rounded-md bg-hoverbg p-2 text-[13px] leading-relaxed placeholder:text-faint focus:bg-white focus:ring-1 focus:ring-inset focus:ring-accent/40"
        />
        <p className="mt-1 px-0.5 text-[11px] text-faint">⌘↵ to save</p>
      </Popover>
    </div>
  );
}
