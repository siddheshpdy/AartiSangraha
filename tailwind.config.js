/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: '#C06000',
        maroon: '#800000',
        cream: '#FFF8E1',
      },
      fontFamily: {
        mukta: ['Mukta', 'sans-serif'],
      },
    },
  },
  plugins: [],
}