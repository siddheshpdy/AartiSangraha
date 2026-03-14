import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Include any icons you placed in the public folder
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      
      manifest: {
        name: 'Aarti Sangraha',
        short_name: 'Aarti',
        description: 'Offline capable Marathi Aarti Sangraha',
        theme_color: '#FFF8E1',
        background_color: '#FFF8E1',
        display: 'standalone',
        icons: [
          // Make sure you have these icons in your public folder
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },

      workbox: {
        // 1. Force the caching of all JS, CSS, HTML, JSON, and SVG files.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
        
        // 2. Cache external Web Fonts (like Mukta from Google Fonts)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});
