import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { generateAartya } from './src/scripts/prebuild.js'
import { addUuids } from './src/scripts/add-uuids.js'
import fs from 'fs'
import path from 'path'

import { VitePWA } from 'vite-plugin-pwa'

let hasRunPrebuild = false;
let isSsrBuild = false;

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist/static',
    chunkSizeWarningLimit: 2000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Automatically removes all console.logs in production
        drop_debugger: true,
      },
      format: {
        comments: false, // Removes all comments from the final bundle
      }
    }
  },
  plugins: [
    react(),
    {
      name: 'watch-markdown-content',
      configResolved(config) {
        // Detect if this is the secondary SSR build step
        isSsrBuild = !!config.build.ssr;
      },
      buildStart() {
        // Prevent running twice: once per process, and skip during SSR
        if (!hasRunPrebuild && !isSsrBuild) {
          addUuids();
          generateAartya();
          hasRunPrebuild = true;
        }
      },
      handleHotUpdate({ file }) {
        // Runs whenever any file is saved during dev
        if (file.endsWith('.md')) {
          addUuids();
          generateAartya();
        }
      }
    },
    {
      name: 'generate-sitemap',
      generateBundle() {
        const aartyaPath = path.resolve(process.cwd(), 'src/data/Aartya.json');
        if (!fs.existsSync(aartyaPath)) return;
        
        const aartyaData = JSON.parse(fs.readFileSync(aartyaPath, 'utf-8'));
        const domain = "https://aartisangraha.co.in";
        
        let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        sitemapContent += `  <url>\n    <loc>${domain}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
        
        aartyaData.forEach(aarti => {
            sitemapContent += `  <url>\n    <loc>${domain}/aarti/${aarti.id}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });
        
        sitemapContent += `</urlset>`;

        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: sitemapContent
        });

        const robotsTxtContent = `User-agent: *\nAllow: /\n\nSitemap: ${domain}/sitemap.xml\n`;
        this.emitFile({
          type: 'asset',
          fileName: 'robots.txt',
          source: robotsTxtContent
        });
      }
    },
    VitePWA({
      registerType: 'prompt',
      // Rename the PWA Service Worker so it doesn't overwrite your Monetag public/sw.js
      filename: 'pwa-sw.js',
      devOptions: {
        enabled: true
      },
      // Explicitly cache your static icons for offline use
      includeAssets: ['favicon.jpeg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        // For SPA behavior, fallback to index.html for navigation requests.
        navigateFallback: 'index.html',
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
            src: 'favicon.jpeg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'favicon.jpeg',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: 'favicon.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
