import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from docs/ while Pages source is still "main / (root)".
// After you switch Pages → /docs or GitHub Actions, you can change
// this back to '/ZiZiPrimaryPrep/'.
export default defineConfig({
  base: '/ZiZiPrimaryPrep/docs/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
