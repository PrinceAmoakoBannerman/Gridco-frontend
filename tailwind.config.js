/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gridco: {
          900: '#071831',
          800: '#0b2545',
          700: '#0e3a6a',
          500: '#1e40af'
        }
      }
    },
  },
  plugins: [],
};
