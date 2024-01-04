/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        light: {
          "text-primary": "hsl(0, 0%, 5%)",
          "text-secondary": "hsl(0, 0%, 22%)",
          "bg-primary": "#ffffff",
          "bg-secondary": "hsl(0, 0%, 95%)",
          "bg-icon": "#e6e6e6",
        },
        dark: {
          "text-primary": "hsl(0, 0%,95%)",
          "bg-primary": "#121212",
          "bg-secondary": "#202020",
          "bg-tertiary": "#313131",
        },
        once: {
          DEFAULT: "#FF5FA2",
          dark: "#FF7FB5",
          hover: "#e65692",
        },
      },
    },
  },
  plugins: [],
};
