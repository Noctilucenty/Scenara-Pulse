import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#06060f",
        surface: "#0d0d1b",
        card: "#111124",
        "card-hover": "#161630",
        border: "rgba(255,255,255,0.07)",
        "border-bright": "rgba(255,255,255,0.13)",
        violet: {
          DEFAULT: "#8b5cf6",
          dim: "#6d3fd8",
          glow: "rgba(139,92,246,0.18)",
        },
        blue: {
          DEFAULT: "#3b82f6",
          dim: "#2563eb",
          glow: "rgba(59,130,246,0.18)",
        },
        text: {
          DEFAULT: "#e2e8f0",
          muted: "#64748b",
          faint: "#334155",
        },
        green: { DEFAULT: "#10b981", glow: "rgba(16,185,129,0.15)" },
        red: { DEFAULT: "#ef4444", glow: "rgba(239,68,68,0.15)" },
        amber: { DEFAULT: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-pulse": "linear-gradient(135deg, #8b5cf6, #3b82f6)",
        "gradient-radial": "radial-gradient(ellipse at center, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
