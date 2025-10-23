import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import path from 'path';
import { sitemap as sitemapData } from './src/data/sitemap.ts';

export default defineConfig({
 site: 'https://www.k4studios.com',   // 👈 Add this
  // Enforce no trailing slashes for routes
  trailingSlash: 'never',
  output: 'server',
  adapter: netlify(),
  integrations: [
    react(),
    tailwind(),  // <-- Tailwind goes here!
    sitemap({
      customPages: sitemapData.map(entry => entry.loc),
      lastmod: (url) => {
        const entry = sitemapData.find(e => e.loc === url);
        return entry?.lastmod || new Date().toISOString();
      },
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@': path.resolve('./src'),
        '@components': path.resolve('./src/components'),
        '@layouts': path.resolve('./src/layouts'),
        '@data': path.resolve('./src/data'),
        '@styles': path.resolve('./src/styles'),
      }
    },
    server: {
      host: true,
      port: 4321,
      origin: 'http://localhost:4321',
      hmr: { clientPort: 443 },
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1']
    }
    // No need for plugins: [tailwindcss()]!
  }
});
