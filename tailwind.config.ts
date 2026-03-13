import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base:    "#070809",
        surface: "#0c0e10",
        elevated:"#121518",
        border:  "#1c2028",
        subtle:  "#161a1f",
        primary: "#e8ecf0",
        secondary:"#8892a0",
        muted:   "#4a5568",
        accent:  "#00d97e",
        "accent-dim": "rgba(0,217,126,0.12)",
        "accent-hover": "#00f090",
        danger:  "#ff4757",
        warning: "#ffb142",
        info:    "#2ed9ff",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        sans:    ["var(--font-dm-sans)", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        lg: "10px",
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 0 0 1px #1c2028, 0 2px 8px rgba(0,0,0,0.4)",
        glow: "0 0 20px rgba(0,217,126,0.2)",
        "glow-sm": "0 0 8px rgba(0,217,126,0.15)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.4" },
        },
        ticker: {
          "0%":   { transform: "translateY(100%)", opacity: "0" },
          "10%":  { transform: "translateY(0)",    opacity: "1" },
          "90%":  { transform: "translateY(0)",    opacity: "1" },
          "100%": { transform: "translateY(-100%)",opacity: "0" },
        },
      },
      animation: {
        "fade-in":    "fade-in 0.4s ease both",
        "slide-in":   "slide-in 0.3s ease both",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        ticker:       "ticker 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
