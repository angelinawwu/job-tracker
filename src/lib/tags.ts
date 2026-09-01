export interface TagStyle {
  bg: string;
  text: string;
  dot: string;
}

export const TAG_PALETTE: Record<string, TagStyle> = {
  green: { bg: "#dbeddb", text: "#1c3829", dot: "#6c9b7d" },
  purple: { bg: "#e8deee", text: "#412454", dot: "#9d68b5" },
  blue: { bg: "#d3e5ef", text: "#183347", dot: "#527da5" },
  yellow: { bg: "#fdecc8", text: "#402c1b", dot: "#cb912f" },
  grey: { bg: "#e3e2e0", text: "#32302c", dot: "#8f8e8a" },
  red: { bg: "#ffe2dd", text: "#5d1715", dot: "#e16f64" },
  orange: { bg: "#fadec9", text: "#49290e", dot: "#d9730d" },
  pink: { bg: "#f5e0e9", text: "#4c2337", dot: "#c14c8a" },
  brown: { bg: "#eee0da", text: "#442a1e", dot: "#9f6b53" },
};

export const DEFAULT_TAGS: Record<string, keyof typeof TAG_PALETTE> = {
  Resume: "green",
  Port: "purple",
  Linkedin: "blue",
  Cover: "yellow",
  Transcript: "grey",
  References: "red",
};

const CUSTOM_COLOR_CYCLE: (keyof typeof TAG_PALETTE)[] = [
  "orange",
  "pink",
  "brown",
  "blue",
  "purple",
  "green",
  "yellow",
  "red",
  "grey",
];

export function tagStyle(name: string): TagStyle {
  const preset = DEFAULT_TAGS[name];
  if (preset) return TAG_PALETTE[preset];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const color = CUSTOM_COLOR_CYCLE[Math.abs(hash) % CUSTOM_COLOR_CYCLE.length];
  return TAG_PALETTE[color];
}

export function statusStyle(label: string): TagStyle {
  const l = label.toLowerCase();
  if (l.includes("offer") || l.includes("accept")) return TAG_PALETTE.green;
  if (l.includes("reject") || l.includes("declin") || l.includes("withdraw"))
    return TAG_PALETTE.red;
  if (l.includes("interview")) return TAG_PALETTE.blue;
  if (l.includes("assessment") || l.includes("oa") || l.includes("test"))
    return TAG_PALETTE.yellow;
  if (l.includes("pending")) return TAG_PALETTE.grey;
  return TAG_PALETTE.purple;
}
