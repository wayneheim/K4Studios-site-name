import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',                     // ✅ Required for SSR
  adapter: netlify(),                   // ✅ Required for Netlify SSR
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        "@": "/src", // Now you can import from '@/...' anywhere
      }
    },
    server: {
      host: true,
      port: 4321,
      origin: 'http://localhost:4321',
      hmr: {
        clientPort: 443,
      },
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
    },
  },
});
