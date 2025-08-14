/** @type {import('tailwindcss/tailwind-config').TailwindConfig} */
module.exports = {
  mode: 'jit',
  purge: {
    content: [
      './src/**/*.{astro,js,jsx,ts,tsx,md,mdx}',
      './components/**/*.{astro,js,jsx,ts,tsx}',
      './pages/**/*.{astro,html,md,mdx}',
      './*.{astro,html}',
    ],
    options: {
      safelist: [
        // keep only what you truly need; start broad, trim later
        /(text|bg|border)-(red|gray|neutral|stone|zinc|slate|blue|indigo|violet|rose)-(100|200|300|400|500|600|700|800|900)/,
        /^(w|h|max-w|max-h|min-w|min-h|m|mx|my|mt|mr|mb|ml|p|px|py|pt|pr|pb|pl|rounded|z|gap)-\[(.+)\]$/,
        /^(bg|text|border|ring|shadow|outline|opacity|top|right|bottom|left|inset|translate-x|translate-y|scale|rotate|skew)-\[(.+)\]$/,
        /^-?(translate-x|translate-y)-\[(.+)\]$/,
        /^aspect-\[(.+)\]$/,
        /ring-(0|1|2|4|8)/,
      ],
    },
  },
  theme: {
    extend: { fontFamily: { glegoo: ['Glegoo', 'serif'] } },
  },
  variants: {},
  plugins: [],
};
