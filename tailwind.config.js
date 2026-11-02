/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: { 50: '#f0fdf4', 500: '#16a34a', 600: '#15803d', 700: '#166534', 900: '#052e16' },
      },
    },
  },
  plugins: [],
};
