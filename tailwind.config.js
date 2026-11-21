/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "forecast-slide": { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(300%)" } },
      },
    },
  },
  plugins: [],
}

