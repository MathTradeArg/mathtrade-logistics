/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.css", 
  ],
  theme: {
    extend: {
      colors: {
        "secondary-blue": "#4da8da", 
        "accent-green": "#80d8c3", 
        "accent-yellow": "#ffd66b",
      },
    },
  },
  plugins: [
  ],
  darkMode: "class",
};
