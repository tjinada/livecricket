/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'cricket-green': '#1e5631',
        'cricket-gold': '#d4af37',
        'pitch': '#c8b88a',
      },
      fontFamily: {
        'score': ['Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
