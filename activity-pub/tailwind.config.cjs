/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,tsx,jsx}", "./index.html"],
  theme: {
    screens: {
      mobile: '440px',
      tablet: '640px',
      laptop: '1060px',
      desktop: '1320px',
    },
    extend: {},
  },
  plugins: [],
}
