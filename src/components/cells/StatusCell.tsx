"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { statusStyle } from "@/lib/tags";
import { MAX_PHASES, todayISO, type StatusPhase } from "@/lib/types";
import Calendar from "../Calendar";
import Popover from "../Popover";

interface StatusCellProps {
  value: StatusPhase[];
  onChange: (phases: StatusPhase[]) => void;
}

const QUICK_PHASES = ["Assessment", "Interview", "Offer", "Rejected"];

function nextLabel(phases: StatusPhase[], base: string): string {
  if (base === "Offer" || base === "Rejected") return base;
  const count = phases.filter((p) =>
    p.label.toLowerCase().startsWith(base.toLowerCase())
  ).length;
  return `${base} ${count + 1}`;
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// Grows with its content up to two and a half lines, so a longer note shows a
// cut-off third line that hints there is more to scroll to.
const MAX_DESCRIPTION_LINES = 2.5;

function DescriptionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    el.style.height = `${Math.min(el.scrollHeight, lineHeight * MAX_DESCRIPTION_LINES)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Add a description…"
      rows={1}
      className="mt-1 w-full resize-none rounded bg-transparent px-0.5 text-[12px] leading-snug placeholder:text-faint focus:bg-white"
    />
  );
}

export default function StatusCell({ value, onChange }: StatusCellProps) {
  const [open, setOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  // Rows are only draggable while their grip is held, so text selection inside
  // the description textareas keeps working.
  const [armedId, setArmedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // The calendar opens inline in the row rather than as a nested popover,
  // since a second portal would count as an outside click and close this one.
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  const current = value[value.length - 1];
  const currentStyle = statusStyle(current?.label ?? "Pending");
  const full = value.length >= MAX_PHASES;

  const addPhase = (label: string) => {
    if (!label.trim() || full) return;
    onChange([
      ...value,
      { id: crypto.randomUUID(), label: label.trim(), description: "", date: todayISO() },
    ]);
    setCustomLabel("");
  };

  const updatePhase = (id: string, patch: Partial<StatusPhase>) => {
    onChange(value.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePhase = (id: string) => {
    // An application always keeps at least one phase
    if (value.length <= 1) return;
    onChange(value.filter((p) => p.id !== id));
  };

  const movePhase = (id: string, to: number) => {
    const from = value.findIndex((p) => p.id === id);
    if (from === -1 || to < 0 || to >= value.length || to === from) return;
    onChange(move(value, from, to));
  };

  const reversed = useMemo(() => [...value].reverse(), [value]);

  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-full w-full items-center gap-1.5 overflow-hidden px-2 text-left transition-colors hover:bg-hoverbg"
      >
        <span
          className="inline-flex h-[18px] shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 text-[11.5px] font-medium leading-none"
          style={{ backgroundColor: currentStyle.bg, color: currentStyle.text }}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: currentStyle.dot }} />
          {current?.label ?? "Pending"}
        </span>
        {value.length > 1 && (
          <span className="shrink-0 text-[11px] tabular-nums text-faint">+{value.length - 1}</span>
        )}
      </button>

      <Popover
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingDateId(null);
        }}
        className="w-[300px]"
      >
        <div className="thin-scroll max-h-[300px] overflow-y-auto p-2">
          <p className="px-1 pb-1.5 text-[11px] font-medium text-faint">
            Status history — newest first, drag to reorder
          </p>
          <div className="flex flex-col gap-1">
            {reversed.map((phase, i) => {
              const s = statusStyle(phase.label);
              const index = value.findIndex((p) => p.id === phase.id);
              const isDragging = draggingId === phase.id;
              return (
                <div
                  key={phase.id}
                  draggable={armedId === phase.id}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingId(phase.id);
                  }}
                  onDragOver={(e) => {
                    if (!draggingId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (draggingId === phase.id) return;
                    // Only swap once the pointer crosses the row's midpoint,
                    // otherwise rows of different heights oscillate.
                    const rect = e.currentTarget.getBoundingClientRect();
                    const past = e.clientY > rect.top + rect.height / 2;
                    const from = value.findIndex((p) => p.id === draggingId);
                    // Display is reversed, so a lower value-index sits visually lower
                    if (index < from ? !past : past) return;
                    movePhase(draggingId, index);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setArmedId(null);
                  }}
                  onDrop={(e) => e.preventDefault()}
                  className={`group rounded-md border border-line p-1.5 transition-[opacity,box-shadow,background-color] ease-out ${
                    i === 0 ? "bg-hoverbg" : ""
                  } ${isDragging ? "opacity-50 shadow-sm" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onMouseDown={() => setArmedId(phase.id)}
                      onMouseUp={() => setArmedId(null)}
                      onKeyDown={(e) => {
                        // Visible list is newest-first, so up == later in history
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          movePhase(phase.id, index + 1);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          movePhase(phase.id, index - 1);
                        }
                      }}
                      disabled={value.length < 2}
                      aria-label={`Reorder ${phase.label}`}
                      className="-ml-0.5 grid h-4 w-3 shrink-0 cursor-grab place-items-center rounded text-faint opacity-0 transition-opacity hover:text-muted focus-visible:opacity-100 active:cursor-grabbing disabled:hidden group-hover:opacity-100"
                    >
                      <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
                        <circle cx="1" cy="1" r="1" />
                        <circle cx="5" cy="1" r="1" />
                        <circle cx="1" cy="5" r="1" />
                        <circle cx="5" cy="5" r="1" />
                        <circle cx="1" cy="9" r="1" />
                        <circle cx="5" cy="9" r="1" />
                      </svg>
                    </button>
                    <span
                      className="inline-flex h-[18px] items-center gap-1 rounded px-1.5 text-[11.5px] font-medium leading-none"
                      style={{ backgroundColor: s.bg, color: s.text }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
                      {phase.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingDateId((id) => (id === phase.id ? null : phase.id))
                      }
                      aria-label={`Edit date for ${phase.label}`}
                      aria-expanded={editingDateId === phase.id}
                      className={`ml-auto rounded px-1 text-[11px] tabular-nums transition-colors hover:bg-white hover:text-muted ${
                        editingDateId === phase.id ? "bg-white text-muted" : "text-faint"
                      }`}
                    >
                      {phase.date || "No date"}
                    </button>
                    {value.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhase(phase.id)}
                        className="grid h-4 w-4 place-items-center rounded text-faint opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        aria-label={`Remove ${phase.label}`}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {editingDateId === phase.id && (
                    <div className="mt-1 flex justify-center rounded-md border border-line bg-white">
                      <Calendar
                        value={phase.date}
                        onSelect={(date) => {
                          updatePhase(phase.id, { date });
                          setEditingDateId(null);
                        }}
                      />
                    </div>
                  )}
                  <DescriptionInput
                    value={phase.description}
                    onChange={(description) => updatePhase(phase.id, { description })}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-line p-2">
          {full ? (
            <p className="px-1 py-1 text-[11.5px] text-faint">
              Up to {MAX_PHASES} phases are kept — remove one to add another.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1">
                {QUICK_PHASES.map((base) => {
                  const label = nextLabel(value, base);
                  const s = statusStyle(base);
                  return (
                    <button
                      key={base}
                      type="button"
                      onClick={() => addPhase(label)}
                      className="pressable inline-flex h-[20px] items-center rounded px-1.5 text-[11.5px] font-medium leading-none transition-opacity hover:opacity-80"
                      style={{ backgroundColor: s.bg, color: s.text }}
                    >
                      + {label}
                    </button>
                  );
                })}
              </div>
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addPhase(customLabel);
                }}
                placeholder="Custom phase, press Enter…"
                className="mt-1.5 h-7 w-full rounded-md border border-line bg-hoverbg px-2 text-[12.5px] placeholder:text-faint focus:border-accent/50 focus:bg-white"
              />
            </>
          )}
        </div>
      </Popover>
    </div>
  );
}
