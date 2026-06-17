import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        soft: "#555555",
        pale: "#f7f5f2",
        line: "#e8e4df",
        accent: "#c17f5a",
        p1: "#4a7c99",
        "p1-pale": "#eef4f8",
        p2: "#9b6b8a",
        "p2-pale": "#f7f0f5",
        green: "#5a8a6a",
        "green-pale": "#eef5f1",
      },
      fontFamily: {
        sans: ["Barlow Condensed", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
