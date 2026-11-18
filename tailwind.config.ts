import type { Config } from "tailwindcss";

/**
 * Tailwind 4 is CSS-first: design tokens live in `app/globals.css` (@theme).
 * This file is kept for content globs + editor tooling and is loaded via
 * `@config` in globals.css.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;