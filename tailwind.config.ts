import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: { 950: "#050914", 900: "#0a1120", 800: "#0e1628", 700: "#14203a" },
        volt: { 400: "#38e1ff", 500: "#22d3ee", 600: "#0ea5e9" },
      },
    },
  },
  plugins: [],
};
export default config;
