import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import tailwind from '@astrojs/tailwind';
import path from 'path';

import cloudflare from '@astrojs/cloudflare';

// Exclude admin pages from production build
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('build');
const excludePatterns = isProduction ? ['src/pages/admin/**/*'] : [];

const smugMugAssetUrlPattern =
  /https:\/\/photos\.smugmug\.com\/[^"'`\\\s),}]+\/(i-[A-Za-z0-9]+)\/[^"'`\\\s),}]+\/(S|M|L|XL|O|Ti)\/[^"'`\\\s),}]+/g;

const sizeMap = {
  S: 's',
  M: 'm',
  L: 'l',
  XL: 'xl',
  O: 'src',
  Ti: 's',
};

function sanitizeSmugMugAssetUrls() {
  return {
    name: 'k4-sanitize-smugmug-asset-urls',
    enforce: 'post',
    renderChunk(code) {
      if (!code.includes('https://photos.smugmug.com')) return null;

      const sanitized = code.replace(smugMugAssetUrlPattern, (_url, imageId, size) => {
        return `/img/${imageId}/${sizeMap[size] || 'm'}.jpg`;
      });

      return sanitized === code ? null : { code: sanitized, map: null };
    },
  };
}

export default defineConfig({
 site: 'https://www.k4studios.com',   // 👈 Add this
  // Enforce no trailing slashes for routes
  trailingSlash: 'never',

  // Netlify adapter requires server output for SSR routes and dynamic admin/tools pages.
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    react(),
    tailwind(),  // <-- Tailwind goes here!
  ],
  // Exclude admin utilities from production builds (dev-only)
  ...(excludePatterns.length > 0 && { exclude: excludePatterns }),
  vite: {
    plugins: [sanitizeSmugMugAssetUrls()],
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
      // Keep Astro on the default dev port so Netlify Dev can proxy correctly.
      // (netlify.toml [dev].targetPort = 4321)
      port: 4321,
      strictPort: true,
      origin: 'http://localhost:4321',
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 4321
      },
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1']
    }
    // No need for plugins: [tailwindcss()]!
  }
});
