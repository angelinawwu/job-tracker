import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        hoverbg: "var(--hover)",
        activebg: "var(--active)",
        accent: "var(--accent)",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
