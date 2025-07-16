import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  integrations: [react()],
  vite: {
    server: {
      host: true,
      port: 4321,
      origin: 'http://localhost:4321',
      hmr: {
        clientPort: 443,
      },
      allowedHosts: [
        '.trycloudflare.com',
        'localhost',
        '127.0.0.1',
      ],
    },
  },
});
