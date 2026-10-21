import { statusStyle } from "./tags";
import type { Application } from "./types";

export interface FlowNode {
  id: string;
  label: string;
  value: number;
  color: string;
  col: number;
  x: number;
  y: number;
  h: number;
}

export interface FlowLink {
  id: string;
  source: FlowNode;
  target: FlowNode;
  value: number;
  width: number;
  y0: number; // centre of the band where it leaves the source
  y1: number; // centre of the band where it enters the target
}

export interface FlowLayout {
  nodes: FlowNode[];
  links: FlowLink[];
  total: number;
}

const APPLIED = "applied";
const NO_RESPONSE = "no response";

const APPLIED_COLOR = "#a8a6a1";
const NO_RESPONSE_COLOR = "#d3d1cd";

function isTerminal(key: string): boolean {
  return (
    key === NO_RESPONSE ||
    /offer|accept|reject|declin|withdr|ghost/.test(key)
  );
}

/** Offers first, dead ends last, so the "good" outcomes sit at the top. */
function terminalRank(key: string): number {
  if (/offer|accept/.test(key)) return 0;
  if (key === NO_RESPONSE) return 3;
  if (/reject|declin/.test(key)) return 2;
  return 1;
}

/**
 * Each application becomes a path: Applied → every recorded phase (except the
 * initial "Pending") → its current phase. Applications that never moved past
 * Pending flow into "No response". Phases are keyed by label, so every
 * application that reached "Interview 1" shares one node.
 */
export function buildFlow(
  applications: Application[],
  size: { width: number; height: number; nodeWidth: number; labelSpace: number; gap: number }
): FlowLayout {
  const labels = new Map<string, string>([
    [APPLIED, "Applied"],
    [NO_RESPONSE, "No response"],
  ]);
  const linkValues = new Map<string, number>();

  for (const app of applications) {
    const path = [APPLIED];
    for (const phase of app.status) {
      const label = phase.label.trim();
      const key = label.toLowerCase();
      if (!key || key.startsWith("pending")) continue;
      if (path[path.length - 1] === key) continue;
      if (!labels.has(key)) labels.set(key, label);
      path.push(key);
    }
    if (path.length === 1) path.push(NO_RESPONSE);
    for (let i = 0; i < path.length - 1; i++) {
      const k = `${path[i]}\u0000${path[i + 1]}`;
      linkValues.set(k, (linkValues.get(k) ?? 0) + 1);
    }
  }

  const edges = Array.from(linkValues, ([k, value]) => {
    const [source, target] = k.split("\u0000");
    return { source, target, value };
  });
  if (edges.length === 0) return { nodes: [], links: [], total: 0 };
  const used = new Set(edges.flatMap((e) => [e.source, e.target]));
  const keys = Array.from(labels.keys()).filter((k) => used.has(k));

  // Longest-path depth. Capped at |nodes| passes so a phase order that loops
  // across applications (A→B in one, B→A in another) can't spin forever.
  const depth = new Map(keys.map((k) => [k, 0]));
  for (let pass = 0; pass < keys.length; pass++) {
    let changed = false;
    for (const e of edges) {
      if (isTerminal(e.source)) continue;
      const d = depth.get(e.source)! + 1;
      if (d > depth.get(e.target)!) {
        depth.set(e.target, d);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const lastCol = Math.max(1, ...keys.filter((k) => !isTerminal(k)).map((k) => depth.get(k)! + 1));
  keys.forEach((k) => {
    if (isTerminal(k)) depth.set(k, lastCol);
  });

  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  for (const e of edges) {
    outflow.set(e.source, (outflow.get(e.source) ?? 0) + e.value);
    inflow.set(e.target, (inflow.get(e.target) ?? 0) + e.value);
  }

  const nodes = new Map<string, FlowNode>();
  for (const k of keys) {
    nodes.set(k, {
      id: k,
      label: labels.get(k)!,
      value: Math.max(inflow.get(k) ?? 0, outflow.get(k) ?? 0),
      color:
        k === APPLIED ? APPLIED_COLOR : k === NO_RESPONSE ? NO_RESPONSE_COLOR : statusStyle(k).dot,
      col: depth.get(k)!,
      x: 0,
      y: 0,
      h: 0,
    });
  }

  const columns: FlowNode[][] = Array.from({ length: lastCol + 1 }, () => []);
  nodes.forEach((n) => columns[n.col].push(n));

  const { width, height, nodeWidth, labelSpace, gap } = size;
  const scale = Math.min(
    ...columns
      .filter((c) => c.length)
      .map((c) => (height - gap * (c.length - 1)) / c.reduce((s, n) => s + n.value, 0))
  );
  const colStep = (width - labelSpace - nodeWidth) / lastCol;

  const place = (col: FlowNode[]) => {
    const colHeight = col.reduce((s, n) => s + n.value * scale, 0) + gap * (col.length - 1);
    let y = (height - colHeight) / 2;
    for (const n of col) {
      n.x = n.col * colStep;
      n.y = y;
      n.h = Math.max(n.value * scale, 1);
      y += n.value * scale + gap;
    }
  };

  // Order each column by where its inflow comes from (barycentre), which
  // keeps bands from crossing; terminal outcomes use a fixed order instead.
  columns.forEach((col, i) => {
    if (i === lastCol) {
      col.sort((a, b) => {
        const ta = isTerminal(a.id) ? 1 : 0;
        const tb = isTerminal(b.id) ? 1 : 0;
        return ta - tb || terminalRank(a.id) - terminalRank(b.id);
      });
    } else if (i > 0) {
      const centre = (n: FlowNode) => {
        let sum = 0;
        let weight = 0;
        for (const e of edges) {
          if (e.target !== n.id) continue;
          const s = nodes.get(e.source)!;
          sum += (s.y + s.h / 2) * e.value;
          weight += e.value;
        }
        return weight ? sum / weight : 0;
      };
      const c = new Map(col.map((n) => [n.id, centre(n)]));
      col.sort((a, b) => c.get(a.id)! - c.get(b.id)!);
    }
    place(col);
  });

  const links: FlowLink[] = edges.map((e) => ({
    id: `${e.source}→${e.target}`,
    source: nodes.get(e.source)!,
    target: nodes.get(e.target)!,
    value: e.value,
    width: e.value * scale,
    y0: 0,
    y1: 0,
  }));

  // Stack bands on each node in the order of the node they connect to, so
  // bands fan out without twisting.
  nodes.forEach((n) => {
    let out = n.y;
    links
      .filter((l) => l.source === n)
      .sort((a, b) => a.target.y - b.target.y)
      .forEach((l) => {
        l.y0 = out + l.width / 2;
        out += l.width;
      });
    let inn = n.y;
    links
      .filter((l) => l.target === n)
      .sort((a, b) => a.source.y - b.source.y)
      .forEach((l) => {
        l.y1 = inn + l.width / 2;
        inn += l.width;
      });
  });

  return { nodes: Array.from(nodes.values()), links, total: applications.length };
}
