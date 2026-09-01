"use client";

import { useEffect, useRef, useState } from "react";

interface TextCellProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function TextCell({
  value,
  onChange,
  placeholder = "Empty",
  className = "",
}: TextCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft.trim());
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`h-full w-full bg-white px-2 text-[13px] ring-1 ring-inset ring-accent/60 ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`h-full w-full truncate px-2 text-left text-[13px] transition-colors hover:bg-hoverbg ${className}`}
      title={value || undefined}
    >
      {value || <span className="text-faint">{placeholder}</span>}
    </button>
  );
}
