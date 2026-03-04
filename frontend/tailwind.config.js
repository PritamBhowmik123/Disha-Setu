/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#00D4AA",
        "primary-dark": "#00A884",
        secondary: "#6366F1",
        accent: "#F59E0B",
        danger: "#EF4444",
        warning: "#F97316",
        success: "#10B981",
        
        main: "rgb(var(--bg-main) / <alpha-value>)",
        card: "rgb(var(--bg-card) / <alpha-value>)",
        cardBorder: "rgb(var(--bg-card-border) / <alpha-value>)",
        surface: "rgb(var(--bg-surface) / <alpha-value>)",
        
        txt: "rgb(var(--text-main) / <alpha-value>)",
        txtMuted: "rgb(var(--text-muted) / <alpha-value>)",
        txtMutedAlt: "rgb(var(--text-muted-alt) / <alpha-value>)",
        
        iconDim: "rgb(var(--icon-dim) / <alpha-value>)",
      },
    },
  },
  plugins: [],
}