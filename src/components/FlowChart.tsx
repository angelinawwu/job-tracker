"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildFlow, type FlowLink, type FlowNode } from "@/lib/sankey";
import type { Application } from "@/lib/types";

const WIDTH = 680;
const HEIGHT = 320;
const NODE_WIDTH = 8;
const LABEL_SPACE = 132;
const GAP = 24;
// Room above the first column's top node for its label
const TOP = 20;

function bandPath(l: FlowLink): string {
  const x0 = l.source.x + NODE_WIDTH;
  const x1 = l.target.x;
  const mid = (x0 + x1) / 2;
  return `M${x0},${l.y0} C${mid},${l.y0} ${mid},${l.y1} ${x1},${l.y1}`;
}

function FlowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2" width="2" height="12" rx="1" fill="currentColor" />
      <rect x="12.5" y="2" width="2" height="4.5" rx="1" fill="currentColor" />
      <rect x="12.5" y="9.5" width="2" height="4.5" rx="1" fill="currentColor" />
      <path
        d="M3.5 5c4.5 0 4.5-.75 9-.75M3.5 11c4.5 0 4.5.75 9 .75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export default function FlowChart({ applications }: { applications: Application[] }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const layout = useMemo(
    () =>
      buildFlow(applications, {
        width: WIDTH,
        height: HEIGHT,
        nodeWidth: NODE_WIDTH,
        labelSpace: LABEL_SPACE,
        gap: GAP,
      }),
    [applications]
  );

  const heardBack = applications.filter((a) =>
    a.status.some((p) => p.label.trim() && !p.label.toLowerCase().startsWith("pending"))
  ).length;
  const offers = applications.filter((a) =>
    a.status.some((p) => /offer|accept/i.test(p.label))
  ).length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // A hovered node lights up every band touching it; a hovered band lights
  // up itself and its two ends.
  const isLit = (item: FlowNode | FlowLink) => {
    if (!hover) return true;
    if ("source" in item) {
      return item.id === hover || item.source.id === hover || item.target.id === hover;
    }
    return (
      item.id === hover ||
      layout.links.some(
        (l) => l.id === hover && (l.source.id === item.id || l.target.id === item.id)
      )
    );
  };

  const lastX = Math.max(0, ...layout.nodes.map((n) => n.x));
  const pct = (n: number) => `${Math.round((n / layout.total) * 100)}%`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Show application flow"
        title="Application flow"
        className={`pressable fixed bottom-5 right-5 z-40 grid h-10 w-10 place-items-center rounded-full border border-line-strong shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          open ? "bg-activebg text-foreground" : "bg-white text-muted hover:bg-hoverbg hover:text-foreground"
        }`}
      >
        <FlowIcon />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Application flow"
          className="popover-enter origin-bottom-right fixed bottom-[68px] right-5 z-40 w-[min(760px,calc(100vw-40px))] rounded-xl border border-line-strong bg-white shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-baseline justify-between gap-4 px-5 pt-4">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Where your applications went</h2>
            {layout.total > 0 && (
              <p className="shrink-0 text-[12px] tabular-nums text-muted">
                {heardBack} of {layout.total} heard back
                {offers > 0 && `, ${offers} offer${offers === 1 ? "" : "s"}`}
              </p>
            )}
          </div>

          {layout.total === 0 ? (
            <p className="px-5 pb-6 pt-3 text-[13px] text-muted">
              Add an application to the table and its path will show up here.
            </p>
          ) : (
            <div className="px-5 pb-4 pt-3">
              <svg
                viewBox={`-2 ${-TOP} ${WIDTH + 4} ${HEIGHT + TOP + 4}`}
                className="flow-reveal block h-auto w-full"
                role="img"
                aria-label={layout.links
                  .map((l) => `${l.source.label} to ${l.target.label}: ${l.value}`)
                  .join(", ")}
                onPointerLeave={() => setHover(null)}
              >
                <defs>
                  {layout.links.map((l, i) => (
                    <linearGradient
                      key={l.id}
                      id={`flow-grad-${i}`}
                      gradientUnits="userSpaceOnUse"
                      x1={l.source.x + NODE_WIDTH}
                      x2={l.target.x}
                    >
                      <stop offset="0%" stopColor={l.source.color} />
                      <stop offset="100%" stopColor={l.target.color} />
                    </linearGradient>
                  ))}
                </defs>

                <g fill="none">
                  {layout.links.map((l, i) => (
                    <path
                      key={l.id}
                      d={bandPath(l)}
                      stroke={`url(#flow-grad-${i})`}
                      strokeWidth={Math.max(l.width, 1)}
                      strokeOpacity={hover === l.id ? 0.75 : isLit(l) ? 0.42 : 0.1}
                      className="cursor-default transition-[stroke-opacity] duration-150"
                      onPointerEnter={() => setHover(l.id)}
                    >
                      <title>
                        {l.source.label} → {l.target.label}: {l.value}
                      </title>
                    </path>
                  ))}
                </g>

                {layout.nodes.map((n) => {
                  const lit = isLit(n);
                  // Outcomes are labelled to their right; earlier stages are
                  // labelled above so the text never sits on a band.
                  const outcome = n.x === lastX;
                  return (
                    <g
                      key={n.id}
                      onPointerEnter={() => setHover(n.id)}
                      className="transition-opacity duration-150"
                      opacity={lit ? 1 : 0.35}
                    >
                      <rect x={n.x} y={n.y} width={NODE_WIDTH} height={n.h} rx={2} fill={n.color} />
                      <text
                        x={outcome ? n.x + NODE_WIDTH + 7 : n.x}
                        y={outcome ? n.y + n.h / 2 : n.y - 8}
                        dominantBaseline={outcome ? "central" : "auto"}
                        stroke="white"
                        strokeWidth={4}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                        className="select-none text-[12px]"
                      >
                        <tspan className="fill-foreground font-medium">{n.label}</tspan>
                        <tspan dx={6} className="fill-muted tabular-nums">
                          {n.value}
                        </tspan>
                        {n.id !== "applied" && (
                          <tspan dx={4} className="fill-faint tabular-nums text-[11px]">
                            {pct(n.value)}
                          </tspan>
                        )}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      )}
    </>
  );
}
