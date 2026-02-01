import type { Config } from "tailwindcss";

export default {
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
        void: "#000000",
        mist: "rgba(24, 24, 27, 0.5)",
        phantom: "#a1a1aa",
        signal: {
          loss: "#f43f5e",
          win: "#22d3ee",
        },
        primary: {
          DEFAULT: "#6366f1", // Keeping for compatibility, but will override visually
          hover: "#4f46e5",
        },
      },
      backgroundImage: {
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")", // Finer noise
      },
      animation: {
        "fog-flow": "fog-flow 20s infinite alternate",
        "pulse-slow": "pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "fog-flow": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0.3" },
          "100%": { transform: "translateY(-20px) scale(1.1)", opacity: "0.6" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
