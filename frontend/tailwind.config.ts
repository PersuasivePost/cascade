import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B0F14",
        surface: "#121821",
        surface2: "#1A222D",
        line: "#232D39",
        ink: "#E7EDF3",
        muted: "#8A96A3",
        ok: "#34D399",
        warn: "#F5A623",
        crit: "#EF4444",
        signal: "#5EA8FF",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        ring: "0 0 0 1px #232D39",
      },
    },
  },
  plugins: [],
};
export default config;
