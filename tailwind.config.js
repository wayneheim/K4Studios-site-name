/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    accentColor: false,
    appearance: false,
    caretColor: false,
    userSelect: false,
  float: false,
  module.exports = {
    content: [
      './src/**/*.{astro,js,jsx,ts,tsx,mdx,html,vue,svelte}',
      './public/**/*.html'
    ],
    safelist: [
      // Keep all inset utilities (override purge)
      'inset-0', 'inset-x-0', 'inset-y-0', 'inset-1', 'inset-2', 'inset-4', 'inset-auto',
      'top-0', 'right-0', 'bottom-0', 'left-0',
      'top-1', 'right-1', 'bottom-1', 'left-1',
      'top-2', 'right-2', 'bottom-2', 'left-2',
      'top-4', 'right-4', 'bottom-4', 'left-4',
      'top-auto', 'right-auto', 'bottom-auto', 'left-auto'
    ],
    theme: {
      extend: {}
    },
    plugins: []
  };
    'p-4',
    'm-4',
    'bg-white',
    'bg-black',
    'text-black',
    'text-white',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};