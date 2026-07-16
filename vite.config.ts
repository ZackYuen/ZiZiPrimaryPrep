import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages is set to "Deploy from a branch" → main / (root).
// The production build is committed under docs/, so the live URL is:
// https://zackyuen.github.io/ZiZiPrimaryPrep/docs/
export default defineConfig({
  base: '/ZiZiPrimaryPrep/docs/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
})
