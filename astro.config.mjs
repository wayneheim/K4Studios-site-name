import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import tailwind from '@astrojs/tailwind';
import path from 'path';

// Exclude admin pages from production build
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('build');
const excludePatterns = isProduction ? ['src/pages/admin/**/*'] : [];

export default defineConfig({
 site: 'https://www.k4studios.com',   // 👈 Add this
  // Enforce no trailing slashes for routes
  trailingSlash: 'never',
  output: 'server',
  adapter: netlify(),
  integrations: [
    react(),
    tailwind(),  // <-- Tailwind goes here!
  ],
  // Exclude admin utilities from production builds (dev-only)
  ...(excludePatterns.length > 0 && { exclude: excludePatterns }),
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
      port: 8888,
      origin: 'http://localhost:8888',
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 8888
      },
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1']
    }
    // No need for plugins: [tailwindcss()]!
  }
});
