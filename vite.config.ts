/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages: https://<user>.github.io/fahrrad-imperium/
export default defineConfig({
  define: { __BUILD_ZEIT__: JSON.stringify(new Date().toISOString()) },
  base: '/fahrrad-imperium/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Fahrrad-Imperium',
        short_name: 'Fahrrad-Imperium',
        description: 'Unternehmensplanspiel: Vom Garagenbetrieb zum Weltmarktführer.',
        lang: 'de',
        theme_color: '#0f766e',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/fahrrad-imperium/',
        scope: '/fahrrad-imperium/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Neue Versionen sofort aktivieren, alte Caches entfernen
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 60000 },
});
