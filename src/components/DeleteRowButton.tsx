"use client";

import { useState } from "react";
import Popover from "./Popover";

interface DeleteRowButtonProps {
  onConfirm: () => void;
}

/**
 * Trash icon that requires a confirmation step before actually deleting
 * the row, so a stray click doesn't silently wipe out an application.
 */
export default function DeleteRowButton({ onConfirm }: DeleteRowButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex h-full items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pressable grid h-6 w-6 place-items-center rounded-md text-faint opacity-0 transition-opacity hover:bg-hoverbg hover:text-red-500 group-hover:opacity-100"
        aria-label="Delete row"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path
            d="M2.5 3.5h9M5.5 3.5v-1a1 1 0 011-1h1a1 1 0 011 1v1M3.5 3.5l.5 8a1 1 0 001 1h4a1 1 0 001-1l.5-8"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Popover open={open} onClose={() => setOpen(false)} align="right" className="w-[210px] p-3">
        <p className="text-[13px] font-medium">Delete this row?</p>
        <p className="mt-0.5 text-[12px] text-muted">This can&apos;t be undone.</p>
        <div className="mt-2.5 flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="pressable h-7 rounded-md px-2.5 text-[12.5px] text-muted transition-colors hover:bg-hoverbg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            className="pressable h-7 rounded-md bg-red-500 px-2.5 text-[12.5px] font-medium text-white transition-colors hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </Popover>
    </div>
  );
}
