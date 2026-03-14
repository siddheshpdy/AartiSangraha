import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { generateAartis } from './src/scripts/prebuild.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'watch-markdown-content',
      buildStart() {
        // Runs once when you start the dev server or run a build
        generateAartis();
      },
      handleHotUpdate({ file }) {
        // Runs whenever any file is saved during dev
        if (file.endsWith('.md')) {
          generateAartis();
        }
      }
    }
  ],
})
