"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

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
 * Flips to render above the trigger when there isn't enough room below
 * (e.g. for rows near the bottom of the table), so it doesn't get clipped.
 */
export default function Popover({
  open,
  onClose,
  children,
  align = "left",
  className = "",
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [openUp, setOpenUp] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    const anchor = el?.parentElement;
    if (!el || !anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    const popoverHeight = el.getBoundingClientRect().height;
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    setOpenUp(popoverHeight > spaceBelow && spaceAbove > spaceBelow);
  }, [open]);

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

  const origin = `origin-${openUp ? "bottom" : "top"}-${align === "right" ? "right" : "left"}`;

  return (
    <div
      ref={ref}
      className={`popover-enter ${origin} ${align === "right" ? "right-0" : "left-0"} ${
        openUp ? "bottom-full mb-1" : "top-full mt-1"
      } absolute z-50 rounded-lg border border-line-strong bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
      role="dialog"
    >
      {children}
    </div>
  );
}
