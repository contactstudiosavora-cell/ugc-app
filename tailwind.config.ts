import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "sans-serif"],
        display: ["var(--font-bebas)", "'Bebas Neue'", "Impact", "sans-serif"],
      },
      colors: {
        cream: "#E9E5DA",
        "cream-card": "#F2EFE7",
        "cream-input": "#FEFCF8",
        olive: "#1A1A10",
        "olive-muted": "#78745F",
        "olive-light": "#B0AA97",
        "olive-dark": "#0E0E08",
        lime: "#C9F019",
        "lime-dark": "#A3C210",
        "lime-pale": "#EBF9A6",
      },
    },
  },
  plugins: [],
};
export default config;
