/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        darkmodal: "#2D3540",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
