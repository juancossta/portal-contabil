import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          dark: "rgb(var(--brand-dark) / <alpha-value>)",
        },
        paper: "#f4f7f6",
        ink: "#20332e",
      },
      fontFamily: {
        display: ["'Segoe UI'", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
