/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        azure: {
          50:  "#eff6ff",
          100: "#dbeafe",
          500: "#0078d4",
          600: "#0066b8",
          700: "#005a9e",
        },
      },
    },
  },
  plugins: [],
};
