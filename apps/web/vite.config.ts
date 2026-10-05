import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'node:fs';

const packageVersion = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
).version;
const builtAt = new Date().toISOString();
const revision = process.env.GITHUB_SHA?.slice(0, 7) ?? builtAt.replace(/\D/g, '').slice(0, 14);
const buildVersion = {
  id: `${revision}-${builtAt}`,
  label: `v${packageVersion} · ${revision}`,
};

export default defineConfig({
  define: { __GAME_VERSION__: JSON.stringify(buildVersion) },
  plugins: [
    {
      name: 'game-version',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify(buildVersion),
        });
      },
    },
    react(),
    VitePWA({
      registerType: 'prompt',
      // Registration and activation are managed by our update banner.
      injectRegister: false,
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'favicon.png',
        'apple-touch-icon.png',
        'icons/*.png',
        'icons/*.svg',
      ],
      manifest: {
        name: 'Math Archer',
        short_name: 'Math Archer',
        description: 'Adaptive Archery Math Practice for Children',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['education', 'games'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Start Practice',
            url: '/?mode=game',
            description: 'Jump straight into archery math practice',
          },
          {
            name: 'Parent Dashboard',
            url: '/?mode=dashboard',
            description: 'View progress and mastery insights',
          },
        ],
      },
      workbox: {
        // Claim open clients only after the player activates the waiting update.
        clientsClaim: true,
        skipWaiting: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        globIgnores: ['**/version.json'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@math-archer/learning-engine': path.resolve(
        __dirname,
        '../../packages/learning-engine/src/index.ts'
      ),
    },
  },
  server: {
    port: 3010,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
