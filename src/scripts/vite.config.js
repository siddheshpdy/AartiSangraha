import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { generateAartis } from './src/scripts/prebuild.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'markdown-to-json-watch',
      buildStart() {
        // Generate on start so we don't depend solely on pre-hooks
        generateAartis();
      },
      handleHotUpdate({ file, server }) {
        if (file.endsWith('.md')) {
          console.log('📝 Markdown change detected, regenerating JSON...');
          generateAartis();
          // Vite will automatically detect the change in aartis.json 
          // and HMR the component importing it.
        }
      }
    }
  ]
});