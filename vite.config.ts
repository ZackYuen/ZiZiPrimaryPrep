import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { transformSync } from '@babel/core'
import fs from 'node:fs'
import path from 'node:path'

/**
 * After Vite legacy build:
 * 1) Re-babel legacy JS to strip leftover ?. / ?? (Safari 10 cannot parse them)
 * 2) Write docs/ipad.html that boots ONLY classic scripts (no type=module)
 * 3) Inject an early UA redirect in docs/index.html for iOS ≤ 11
 */
function ipadLegacyBoot(): Plugin {
  let outDir = 'docs'
  let base = '/'
  return {
    name: 'zizi-ipad-legacy-boot',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      base = config.base
    },
    closeBundle() {
      const absOut = path.resolve(outDir)
      const assetsDir = path.join(absOut, 'assets')
      if (!fs.existsSync(assetsDir)) return

      const files = fs.readdirSync(assetsDir)
      const legacyEntry = files.find((f) => f.startsWith('index-legacy-') && f.endsWith('.js'))
      const legacyPoly = files.find((f) => f.startsWith('polyfills-legacy-') && f.endsWith('.js'))
      const css = files.find((f) => f.startsWith('index-') && f.endsWith('.css') && !f.includes('legacy'))
      if (!legacyEntry || !legacyPoly || !css) {
        console.warn('[zizi-ipad] missing legacy assets; skip ipad.html')
        return
      }

      // Force ES5-safe syntax on the legacy app chunk (Safari 10 / iOS 10.3).
      const legacyPath = path.join(assetsDir, legacyEntry)
      const raw = fs.readFileSync(legacyPath, 'utf8')
      const transformed = transformSync(raw, {
        babelrc: false,
        configFile: false,
        compact: true,
        comments: false,
        sourceType: 'script',
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { ios: '10.3', safari: '10.1' },
              bugfixes: true,
              modules: false,
              // Already bundled; only syntax downlevel.
              exclude: ['transform-typeof-symbol'],
            },
          ],
        ],
        plugins: [
          '@babel/plugin-transform-optional-chaining',
          '@babel/plugin-transform-nullish-coalescing-operator',
        ],
      })
      if (!transformed?.code) {
        throw new Error('[zizi-ipad] babel failed on legacy chunk')
      }
      let code = transformed.code
      // Real optional chaining is ?.ident / ?.( / ?.[ — NOT ternary+decimal like t?.88:.92
      const optRe = /\?\.(?=[A-Za-z_$([{])/g
      const nullRe = /\?\?/g
      const leftOpt = (code.match(optRe) || []).length
      const leftNull = (code.match(nullRe) || []).length
      if (leftOpt > 0 || leftNull > 0) {
        throw new Error(
          `[zizi-ipad] Cannot ship Safari-10-incompatible syntax in ${legacyEntry} (?.=${leftOpt}, ??=${leftNull})`,
        )
      }
      fs.writeFileSync(legacyPath, code)

      const polyHref = `${base}assets/${legacyPoly}`
      const entryHref = `${base}assets/${legacyEntry}`
      const cssHref = `${base}assets/${css}`

      const ipadHtml = `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="袁碩孜升小面試 — 舊 iPad（iOS 10）專用頁" />
    <title>碩孜升小面試 · 舊 iPad</title>
    <link rel="stylesheet" href="${cssHref}" />
    <style>
      #zizi-boot {
        font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif;
        padding: 1.25rem;
        color: #1b3a4b;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <div id="zizi-boot">載入中…（舊 iPad 模式）</div>
    <div id="root"></div>
    <!-- Classic scripts only — no type=module (Safari 10 dies on modern modules). -->
    <script src="${polyHref}"></script>
    <script>
      (function () {
        function fail(msg) {
          var el = document.getElementById('zizi-boot');
          if (el) el.textContent = msg;
        }
        try {
          if (typeof System === 'undefined' || !System.import) {
            fail('SystemJS 未載入。請用較新 iPhone／iPad 開啟。');
            return;
          }
          System.import('${entryHref}').then(function () {
            var el = document.getElementById('zizi-boot');
            if (el && el.parentNode) el.parentNode.removeChild(el);
          }).catch(function (err) {
            fail('載入失敗：' + (err && err.message ? err.message : String(err)));
          });
        } catch (err) {
          fail('啟動失敗：' + (err && err.message ? err.message : String(err)));
        }
      })();
    </script>
  </body>
</html>
`

      fs.writeFileSync(path.join(absOut, 'ipad.html'), ipadHtml)

      // Patch docs/index.html: first thing — send old iOS to ipad.html
      const indexPath = path.join(absOut, 'index.html')
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8')
        const boot = `<script>
(function(){
  try {
    var ua = navigator.userAgent || '';
    var m = ua.match(/OS (\\d+)[_ ]/);
    var ios = m ? parseInt(m[1], 10) : 99;
    // iPad/iPhone iOS 10–11: Vite module + Safari bugs → blank page. Use classic boot.
    if (/iP(hone|ad|od)/.test(ua) && ios > 0 && ios <= 11) {
      var dest = '${base}ipad.html';
      if (location.pathname.indexOf('ipad.html') === -1) {
        location.replace(dest + location.search + location.hash);
      }
    }
  } catch (e) {}
})();
</script>`
        if (!html.includes('ipad.html')) {
          html = html.replace('<head>', '<head>\n    ' + boot)
          fs.writeFileSync(indexPath, html)
        }
      }

      console.log('[zizi-ipad] wrote ipad.html + UA redirect; re-babelled', legacyEntry)
    },
  }
}

// GitHub Pages is set to "Deploy from a branch" → main / (root).
// Live URL: https://zackyuen.github.io/ZiZiPrimaryPrep/docs/
export default defineConfig({
  base: '/ZiZiPrimaryPrep/docs/',
  plugins: [
    react(),
    legacy({
      targets: ['iOS >= 10.3', 'Safari >= 10.1'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      modernPolyfills: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any),
    ipadLegacyBoot(),
  ],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    cssTarget: 'safari10',
    minify: 'terser',
    terserOptions: {
      // Prevent terser from re-introducing ?. / ?? into any chunk it minifies.
      ecma: 5,
      compress: { ecma: 5 },
      format: { ecma: 5 },
    },
  },
})
