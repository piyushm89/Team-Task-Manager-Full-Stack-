/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f5ff',
          500: '#5b6cff',
          600: '#4753e8',
          700: '#3a44c4'
        }
      }
    }
  },
  plugins: []
};
