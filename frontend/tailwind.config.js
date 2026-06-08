/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "rgb(var(--app-bg) / <alpha-value>)",
          surface: "rgb(var(--app-surface) / <alpha-value>)",
          surfaceMuted: "rgb(var(--app-surface-muted) / <alpha-value>)",
          text: "rgb(var(--app-text) / <alpha-value>)",
          muted: "rgb(var(--app-muted) / <alpha-value>)",
          border: "rgb(var(--app-border) / <alpha-value>)",
          accent: "rgb(var(--app-accent) / <alpha-value>)",
          accentHover: "rgb(var(--app-accent-hover) / <alpha-value>)",
          accentSoft: "rgb(var(--app-accent-soft) / <alpha-value>)",
          accentText: "rgb(var(--app-accent-text) / <alpha-value>)",
          ring: "rgb(var(--app-ring) / <alpha-value>)"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};
