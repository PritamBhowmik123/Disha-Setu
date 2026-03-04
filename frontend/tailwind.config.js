/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
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
        dark: {
          bg: "#0A0E1A",
          card: "#111827",
          border: "#1F2937",
          surface: "#1A2035",
        },
      },
    },
  },
  plugins: [],
}