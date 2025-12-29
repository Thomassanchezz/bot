/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A8A',
        secondary: '#06B6D4',
        accent: '#10B981',
        card: '#0b1220',
        bgStart: '#071029',
        bgEnd: '#0f1724'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        heading: ['Poppins', 'Inter']
      },
      boxShadow: {
        soft: '0 6px 18px rgba(2,6,23,0.6)'
      },
      borderRadius: {
        xl: '1rem'
      },
      keyframes: {
        float: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
          '100%': { transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        pop: {
          '0%': { transform: 'scale(0.98)', opacity: '0.9' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        fadeIn: 'fadeIn 300ms ease-out both',
        pop: 'pop 150ms ease-out both'
      }
    },
  },
  plugins: [],
}
