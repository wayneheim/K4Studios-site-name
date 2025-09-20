/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    accentColor: false,
    appearance: false,
    caretColor: false,
    userSelect: false,
    float: false,
  },
  content: [
    './src/**/*.{astro,js,jsx,ts,tsx,mdx,html,vue,svelte}',
    './public/**/*.html',
  ],
  safelist: [
    // Explicitly include inset-0
    'inset-0',
    // Pattern-based safelist for all inset utilities
    { pattern: /inset(-[xy])?-(0|1|2|3|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|1\/2|1\/3|2\/3|1\/4|2\/4|3\/4|full)/ },
    { pattern: /(top|right|bottom|left)-(0|1|2|3|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|1\/2|1\/3|2\/3|1\/4|2\/4|3\/4|full)/ },
    { pattern: /-inset(-[xy])?-(0|1|2|3|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|1\/2|1\/3|2\/3|1\/4|2\/4|3\/4|full)/ },
    { pattern: /-(top|right|bottom|left)-(0|1|2|3|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|1\/2|1\/3|2\/3|1\/4|2\/4|3\/4|full)/ },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};