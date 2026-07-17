import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// GitHub Pages is set to "Deploy from a branch" → main / (root).
// The production build is committed under docs/, so the live URL is:
// https://zackyuen.github.io/ZiZiPrimaryPrep/docs/
//
// @vitejs/plugin-legacy emits SystemJS chunks for iOS Safari 10.3 (iPad)
// via <script nomodule>, while modern phones still get the ESM build.
export default defineConfig({
  base: '/ZiZiPrimaryPrep/docs/',
  plugins: [
    react(),
    legacy({
      targets: ['iOS >= 10.3', 'Safari >= 10.1'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      // Keep modern + legacy so current iPhones stay fast.
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
  ],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    cssTarget: 'safari10',
  },
})
