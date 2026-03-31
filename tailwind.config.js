/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f1117",
          card: "#1a1d27",
          hover: "#22263a",
          border: "#2d3148",
        },
        accent: {
          blue: "#4a9eff",
          green: "#32d583",
          red: "#f87171",
        },
      },
    },
  },
  plugins: [],
}

