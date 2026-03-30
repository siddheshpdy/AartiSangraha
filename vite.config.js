import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { generateAartya } from './src/scripts/prebuild.js'
import { addUuids } from './src/scripts/add-uuids.js'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist/static',
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    react(),
    {
      name: 'watch-markdown-content',
      buildStart() {
        // Runs once when you start the dev server or run a build
        addUuids();
        generateAartya();
      },
      handleHotUpdate({ file }) {
        // Runs whenever any file is saved during dev
        if (file.endsWith('.md')) {
          addUuids();
          generateAartya();
        }
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      // Rename the PWA Service Worker so it doesn't overwrite your Monetag public/sw.js
      filename: 'pwa-sw.js',
      devOptions: {
        enabled: true
      },
      // Explicitly cache your static icons for offline use
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        // For SPA behavior, fallback to index.html for navigation requests.
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // Cache for 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifestFilename: 'manifest.json',
      manifest: {
        name: 'Aarti Sangraha',
        short_name: 'AartiApp',
        description: 'Marathi Aartya for daily offline reading.',
        theme_color: '#FFF8E1',
        background_color: '#FFF8E1',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'favicon.svg',
          sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
