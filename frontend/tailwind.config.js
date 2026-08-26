/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="minimal-dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Comfortaa"', "system-ui", "sans-serif"],
      },
      colors: {
        romantic: {
          50: "#fff1f5",
          100: "#ffe0ea",
          200: "#ffc1d5",
          300: "#ff8db1",
          400: "#ff5d92",
          500: "#ff2e76",
          600: "#e0185e",
          700: "#b30f4b",
        },
      },
      animation: {
        "heart-pulse": "heartPulse 1.4s ease-in-out infinite",
        floatY: "floatY 6s ease-in-out infinite",
      },
      keyframes: {
        heartPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.12)" },
        },
        floatY: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
};
