/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Você pode adicionar cores customizadas aqui
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
