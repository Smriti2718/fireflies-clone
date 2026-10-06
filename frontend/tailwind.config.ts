import type { Config } from "tailwindcss";

// Colors are CSS variables (see globals.css) so light/dark themes swap in one place.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        surface: v("surface"),
        raised: v("raised"),
        line: v("line"),
        ink: v("ink"),
        muted: v("muted"),
        faint: v("faint"),
        brand: { DEFAULT: v("brand"), soft: v("brand-soft"), ink: v("brand-ink") },
        ok: v("ok"),
        danger: v("danger"),
        mark: v("mark"),
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        pop: "0 12px 32px -8px rgb(30 20 60 / 0.18), 0 2px 6px rgb(30 20 60 / 0.06)",
      },
      keyframes: {
        "toast-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        "modal-in": { from: { opacity: "0", transform: "scale(.97)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "toast-in": "toast-in .18s ease-out",
        "modal-in": "modal-in .14s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
