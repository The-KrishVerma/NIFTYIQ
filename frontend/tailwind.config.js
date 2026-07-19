/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        insight: {
          black: '#000000',
          card: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#F3F4F6',
          muted: '#9CA3AF',
          blue: '#38BDF8', // Neon Cyan
          'blue-soft': '#7DD3FC',
          'blue-lighter': '#BAE6FD',
          purple: '#A855F7', // Electric Purple
          dark: '#050505',
          deep: '#030303',
        }
      },
      animation: {
        'glow-pulse': 'glow 3s infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(168, 85, 247, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
