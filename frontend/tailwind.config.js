/** @type {import('tailwindcss').Config} */
// Color keys (navy/cyan/rust) don't match their hex values — they're mapped
// to a warm drafting-paper palette instead: navy = paper/ink neutrals,
// cyan = blueprint blue + ink, rust = redline warnings.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#F3EFE6", // page background — drafting paper
          900: "#FBF9F4", // panel background — slightly lighter sheet
          800: "#ECE6D8", // hover / subtle fill
          700: "#DCD4BF", // dividers
          600: "#8A8371", // hairline borders — warm graphite
        },
        cyan: {
          400: "#1F3A5F", // blueprint blue — primary accent
          300: "#2B2B28", // ink — primary text
        },
        rust: {
          500: "#B5502F", // redline — warnings, danger
          400: "#C46A46",
        },
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
