import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import path from 'path';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
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
    ssr: {
      external: ['nodemailer'], // 👈 This tells Vite not to bundle nodemailer
    },
    server: {
      host: true,
      port: 4321,
      origin: 'http://localhost:4321',
      hmr: { clientPort: 443 },
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1']
    }
  }
});
