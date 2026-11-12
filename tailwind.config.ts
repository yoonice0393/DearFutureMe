import type { Config } from "tailwindcss";

/**
 * Design tokens. Source of truth: docs/DESIGN.md.
 * Colors are CSS variables (src/styles/index.css) so dark mode swaps them in one place.
 */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

// 8px spacing system: 4, 8, 12, 16, 24, 32, 48, 64, 96 (+ 40/56 for mobile section padding).
const spacing = {
  0: "0px",
  px: "1px",
  0.5: "2px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  14: "56px",
  16: "64px",
  24: "96px",
};

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    spacing,
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#FFFFFF",
      paper: token("paper"),
      "paper-deep": token("paper-deep"),
      sheet: token("sheet"),
      ink: token("ink"),
      pencil: token("pencil"),
      postal: token("postal"),
      "on-postal": token("on-postal"),
      stamp: token("stamp"),
      rule: token("rule"),
      border: token("border"),
    },
    fontFamily: {
      serif: ['"Fraunces Variable"', "Georgia", "serif"],
      sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      hand: ['"Caveat"', "cursive"],
    },
    fontSize: {
      xs: ["14px", { lineHeight: "20px" }],
      sm: ["16px", { lineHeight: "24px" }],
      base: ["18px", { lineHeight: "1.65" }],
      lg: ["22px", { lineHeight: "32px" }],
      xl: ["28px", { lineHeight: "36px" }],
      "2xl": ["36px", { lineHeight: "44px" }],
      "3xl": ["48px", { lineHeight: "56px" }],
    },
    borderRadius: {
      none: "0px",
      sm: "2px",
      DEFAULT: "2px",
      full: "9999px",
    },
    extend: {
      // Fixed sizes for decorative illustrations (stamps, postmarks). Not for layout spacing.
      width: {
        20: "80px",
        28: "112px",
        40: "160px",
        48: "192px",
      },
      maxWidth: {
        prose: "65ch",
        page: "1120px",
      },
      boxShadow: {
        paper: "0 1px 0 rgb(var(--c-rule)), 0 8px 24px -16px rgb(var(--c-ink) / 0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
