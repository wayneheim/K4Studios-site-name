/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,js,jsx,ts,tsx,mdx,html,vue,svelte}',
    './public/**/*.html',
  ],
  safelist: [
    'inset-0', 'inset-x-0', 'inset-y-0',
    'top-0', 'right-0', 'bottom-0', 'left-0',
    // Add more inset classes as needed
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};