import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: https://zackyuen.github.io/ZiZiPrimaryPrep/
export default defineConfig({
  base: '/ZiZiPrimaryPrep/',
  plugins: [react()],
  build: {
    // Commit docs/ so "Deploy from a branch → /docs" works immediately.
    // GitHub Actions also publishes this folder.
    outDir: 'docs',
    emptyOutDir: true,
  },
})
