/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // needed since your app uses dark: classes + toggles via class/attribute
  theme: {
    extend: {},
  },
  plugins: [],
}