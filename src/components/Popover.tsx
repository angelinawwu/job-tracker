"use client";

import { ReactNode, useEffect, useRef } from "react";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

/**
 * Lightweight anchored popover. Renders below its relatively-positioned
 * parent, closes on outside click / Escape, and scales in from the trigger.
 */
export default function Popover({
  open,
  onClose,
  children,
  align = "left",
  className = "",
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`popover-enter ${align === "right" ? "origin-top-right right-0" : "left-0"} absolute top-full z-50 mt-1 rounded-lg border border-line-strong bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
      role="dialog"
    >
      {children}
    </div>
  );
}
