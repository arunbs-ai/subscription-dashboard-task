export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f2ff',
          100: '#ece6ff',
          200: '#dbd0ff',
          300: '#c2affe',
          400: '#a384ff',
          500: '#8f68ff',
          600: '#7C53FF',
          700: '#6a3fe8',
          800: '#5732c0',
          900: '#47299a',
          950: '#2a1862',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
