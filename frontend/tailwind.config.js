/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        insight: {
          black: '#0F1115',
          card: '#171A21',
          border: '#232733',
          text: '#E6E8EB',
          muted: '#9CA3AF',
          blue: '#93C5FD',
          'blue-soft': '#A5B4FC',
          'blue-lighter': '#D8B4FE',
          purple: '#8B5CF6',
          dark: '#12121E',
          deep: '#0A0A0F',
        }
      }
    },
  },
  plugins: [],
}
