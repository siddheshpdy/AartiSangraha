import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { generateAartya } from './src/scripts/prebuild.js'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'watch-markdown-content',
      buildStart() {
        // Runs once when you start the dev server or run a build
        generateAartya();
      },
      handleHotUpdate({ file }) {
        // Runs whenever any file is saved during dev
        if (file.endsWith('.md')) {
          generateAartya();
        }
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
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
          },
          {
            urlPattern: /manifest\.webmanifest$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'manifest-cache'
            }
          }
        ]
      },
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
