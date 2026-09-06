export interface TagStyle {
  bg: string;
  text: string;
  dot: string;
}

export const TAG_PALETTE: Record<string, TagStyle> = {
  green: { bg: "#d8f0ce", text: "#0b351f", dot: "#6c9b7d" },
  purple: { bg: "#e5d1f0", text: "#391153", dot: "#9d68b5" },
  blue: { bg: "#c8e3f3", text: "#0f2c42", dot: "#527da5" },
  yellow: { bg: "#ffe9bc", text: "#4d2b0d", dot: "#cb912f" },
  grey: { bg: "#dfddda", text: "#332917", dot: "#8f8e8a" },
  red: { bg: "#ffd9d3", text: "#540f0a", dot: "#e16f64" },
  orange: { bg: "#ffd7ba", text: "#421f00", dot: "#d9730d" },
  pink: { bg: "#fad0e2", text: "#4b0f2c", dot: "#c14c8a" },
  brown: { bg: "#f2d7cc", text: "#421e0e", dot: "#9f6b53" },
};

export const DEFAULT_TAGS: Record<string, keyof typeof TAG_PALETTE> = {
  Resume: "green",
  Port: "purple",
  Linkedin: "blue",
  Cover: "yellow",
  Transcript: "grey",
  References: "red",
  Github: "pink",
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
