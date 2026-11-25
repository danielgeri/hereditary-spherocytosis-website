import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Emits a self-contained, content-hashed offline Service Worker (`dist/sw.js`)
 * precaching the entire static 3D atlas (HTML, hashed JS/CSS chunks, icons, manifest)
 * with zero external PWA build dependencies.
 */
function pwaServiceWorkerPlugin(): Plugin {
  let outDir = 'dist';

  return {
    name: 'hs-atlas-pwa-sw',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      if (!fs.existsSync(outDir)) return;

      const files: string[] = [];
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else {
            const rel = path.relative(outDir, full).replace(/\\/g, '/');
            if (rel === 'CNAME' || rel === 'sw.js') continue;
            files.push('/' + rel);
          }
        }
      };
      walk(outDir);
      files.sort();

      const hash = crypto.createHash('sha256');
      for (const rel of files) {
        hash.update(rel);
        hash.update(fs.readFileSync(path.join(outDir, rel.slice(1))));
      }
      const version = hash.digest('hex').slice(0, 10);
      const precacheList = ['/', ...files];

      const swSource = `// HS Atlas Service Worker (auto-generated at build time)
const CACHE_NAME = 'hs-atlas-${version}';
const FONT_CACHE = 'hs-atlas-fonts-v1';
const PRECACHE_URLS = ${JSON.stringify(precacheList, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== FONT_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Stale-while-revalidate for Google Fonts so typography works offline too
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res && res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Network-first for HTML navigations with instant offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return res;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Cache-first for hashed bundles, icons, and manifest
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
`;

      fs.writeFileSync(path.join(outDir, 'sw.js'), swSource, 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaServiceWorkerPlugin()],
  // Root base path for custom domain https://hs.geri.io/
  base: '/',
  server: {
    port: 5173,
    strictPort: false,
  },
});
