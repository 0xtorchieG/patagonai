import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        primary: "#3B82F6",    // Bright blue
        secondary: "#10B981",  // Emerald
        accent: "#F59E0B",     // Amber
        neutral: "#374151",    // Cool gray
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [{
      dark: {
        ...require("daisyui/src/theming/themes")["dark"],
        primary: "#3B82F6",    // Bright blue
        secondary: "#10B981",  // Emerald
        accent: "#F59E0B",     // Amber
        success: "#22C55E",    // Green
        warning: "#F59E0B",    // Amber
        error: "#EF4444",      // Red
      }
    }],
  },
};

export default config;
