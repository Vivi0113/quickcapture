/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        pending: '#F97316',
        resolved: '#22C55E',
        snoozed: '#6B7280'
      }
    }
  },
  plugins: []
}
