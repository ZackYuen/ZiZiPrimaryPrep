import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Actions deploys the `docs/` build as the site root:
// https://zackyuen.github.io/ZiZiPrimaryPrep/
export default defineConfig({
  base: '/ZiZiPrimaryPrep/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
