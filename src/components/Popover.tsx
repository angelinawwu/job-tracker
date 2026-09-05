"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

const GAP = 4;

/**
 * Lightweight anchored popover. Portals its floating content to
 * document.body and positions it with `fixed` coordinates measured from
 * the trigger, so it can never get clipped by an ancestor's overflow
 * (e.g. the table's horizontally-scrolling wrapper). Closes on outside
 * click / Escape, and scales in from the trigger. Flips to render above
 * the trigger when there isn't enough room below (e.g. for rows near the
 * bottom of the table).
 */
export default function Popover({
  open,
  onClose,
  children,
  align = "left",
  className = "",
}: PopoverProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [openUp, setOpenUp] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const anchor = anchorRef.current;
    const el = floatingRef.current;
    if (!anchor || !el) return;

    const reposition = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const popoverRect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - anchorRect.bottom;
      const spaceAbove = anchorRect.top;
      const up = popoverRect.height > spaceBelow && spaceAbove > spaceBelow;
      setOpenUp(up);
      setCoords({
        top: up ? anchorRect.top - popoverRect.height - GAP : anchorRect.bottom + GAP,
        left: align === "right" ? anchorRect.right - popoverRect.width : anchorRect.left,
      });
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, align, children]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (floatingRef.current && !floatingRef.current.contains(e.target as Node)) onClose();
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

  // Always-mounted, zero-size marker at the trigger's position — used to
  // measure the anchor rect since the floating content itself lives in a
  // portal and can't rely on a relatively-positioned parent.
  const anchor = <span ref={anchorRef} className="absolute inset-0 pointer-events-none" aria-hidden />;

  if (!open || !mounted) return anchor;

  const origin = `origin-${openUp ? "bottom" : "top"}-${align === "right" ? "right" : "left"}`;

  return (
    <>
      {anchor}
      {createPortal(
        <div
          ref={floatingRef}
          className={`popover-enter ${origin} fixed z-50 rounded-lg border border-line-strong bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
          style={{ top: coords?.top ?? -9999, left: coords?.left ?? -9999, visibility: coords ? "visible" : "hidden" }}
          role="dialog"
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
