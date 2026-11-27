#!/usr/bin/env node
/**
 * Build-time SSG prerenderer for GitHub Pages (https://hs.geri.io/):
 * 1. Prerenders all 9 semantic HTML routes with unique <title>, <meta>, canonical,
 *    Open Graph, Twitter Card, and Schema.org JSON-LD (MedicalWebPage + MedicalCondition + BreadcrumbList + FAQPage).
 * 2. Generates dist/sitemap.xml and dist/robots.txt.
 * 3. Emits content-hashed dist/sw.js precaching all prerendered routes and assets for offline PWA support.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = path.resolve(import.meta.dirname, '..');
const distDir = path.join(rootDir, 'dist');
const ssrEntryPath = path.join(rootDir, 'dist-ssr', 'entry-server.js');

const { renderRoute, SEO_ROUTES, PUBMED_REFERENCES, SITE_ORIGIN, SITE_LAST_UPDATED } = await import(
  pathToFileURL(ssrEntryPath).href
);

const templatePath = path.join(distDir, 'index.html');
const template = fs.readFileSync(templatePath, 'utf8');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildJsonLd(route) {
  const canonicalUrl = `${SITE_ORIGIN}${route.path}`;
  const citations = PUBMED_REFERENCES.map((r) => ({
    '@type': 'ScholarlyArticle',
    name: r.journal,
    url: r.url,
  }));

  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      url: `${SITE_ORIGIN}/`,
      name: 'HS Atlas — Interactive 3D Red Blood Cell',
      description:
        'Interactive 3D red blood cell visualization and dual-depth hematology guide to hereditary spherocytosis.',
    },
    {
      '@type': 'MedicalCondition',
      '@id': `${SITE_ORIGIN}/#condition`,
      name: 'Hereditary Spherocytosis',
      alternateName: ['Minkowski-Chauffard syndrome', 'Congenital spherocytic hemolytic anemia'],
      associatedAnatomy: {
        '@type': 'AnatomicalStructure',
        name: 'Erythrocyte (Red Blood Cell) Membrane',
      },
      possibleTreatment: [
        { '@type': 'MedicalTherapy', name: 'Folic acid supplementation' },
        { '@type': 'MedicalTherapy', name: 'Phototherapy for neonatal hyperbilirubinemia' },
        { '@type': 'MedicalProcedure', name: 'Partial or total splenectomy' },
      ],
      typicalTest: [
        { '@type': 'MedicalTest', name: 'Eosin-5-maleimide (EMA) binding test' },
        { '@type': 'MedicalTest', name: 'Osmotic gradient ektacytometry (OGE)' },
        { '@type': 'MedicalTest', name: 'Complete blood count with MCHC and RDW' },
        { '@type': 'MedicalTest', name: 'Direct antiglobulin test (DAT / Coombs)' },
        { '@type': 'MedicalTest', name: 'Next-generation sequencing (ANK1, SPTB, SLC4A1, SPTA1, EPB42)' },
      ],
    },
    {
      '@type': 'MedicalWebPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: route.title,
      description: route.description,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: { '@id': `${SITE_ORIGIN}/#condition` },
      dateModified: SITE_LAST_UPDATED,
      lastReviewed: SITE_LAST_UPDATED,
      inLanguage: 'en',
      audience: [
        { '@type': 'PeopleAudience', audienceType: 'Patients and families' },
        { '@type': 'MedicalAudience', audienceType: 'Clinicians and medical students' },
      ],
      citation: citations,
    },
  ];

  // BreadcrumbList for subpages (and root item for home)
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'HS Atlas',
      item: `${SITE_ORIGIN}/`,
    },
  ];
  if (route.path !== '/') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: route.kind === 'gene' ? 'Five Genes' : 'Evaluation & Diagnosis',
      item: `${SITE_ORIGIN}/${route.kind === 'gene' ? '#genetics' : '#diagnosis'}`,
    });
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: route.shortLabel,
      item: canonicalUrl,
    });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  });

  if (route.faqs && route.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: route.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer.plain,
        },
      })),
    });
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
    /</g,
    '\\u003c'
  );
}

function buildSeoHead(route) {
  const canonicalUrl = `${SITE_ORIGIN}${route.path}`;
  const ogImage = `${SITE_ORIGIN}/og-image.png`;
  const title = escapeHtml(route.title);
  const desc = escapeHtml(route.description);
  const jsonLd = buildJsonLd(route);

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta property="og:site_name" content="HS Atlas" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Interactive 3D biconcave red blood cell model for hereditary spherocytosis" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ');
}

// 1. Prerender every SEO route into real static HTML files
for (const route of SEO_ROUTES) {
  const appHtml = renderRoute(route.path);
  const seoHead = buildSeoHead(route);

  let html = template.replace(
    /<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/,
    `<!-- SEO_HEAD_START -->\n    ${seoHead}\n    <!-- SEO_HEAD_END -->`
  );
  html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  const targetFile =
    route.path === '/'
      ? path.join(distDir, 'index.html')
      : path.join(distDir, route.path.replace(/^\/|\/$/g, ''), 'index.html');

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, html, 'utf8');
  console.log(`Prerendered ${route.path} -> ${path.relative(rootDir, targetFile)} (${html.length} bytes)`);
}

// 2. Generate dist/sitemap.xml and dist/robots.txt
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SEO_ROUTES.map(
  (r) => `  <url>
    <loc>${SITE_ORIGIN}${r.path}</loc>
    <lastmod>${SITE_LAST_UPDATED}</lastmod>
    <changefreq>${r.path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${r.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8');
console.log(`Generated dist/sitemap.xml (${SEO_ROUTES.length} URLs) and dist/robots.txt`);

// 3. Emit content-hashed dist/sw.js precaching all prerendered HTML routes & static assets
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else {
      const rel = path.relative(distDir, full).replace(/\\/g, '/');
      if (rel === 'CNAME' || rel === 'sw.js' || rel === 'sitemap.xml' || rel === 'robots.txt') continue;
      files.push('/' + rel);
    }
  }
};
walk(distDir);
files.sort();

const hash = crypto.createHash('sha256');
for (const rel of files) {
  hash.update(rel);
  hash.update(fs.readFileSync(path.join(distDir, rel.slice(1))));
}
const version = hash.digest('hex').slice(0, 10);
const routeDirs = SEO_ROUTES.map((r) => r.path);
const precacheSet = Array.from(new Set([...routeDirs, ...files]));

const swSource = `// HS Atlas Service Worker (auto-generated after SSG prerender)
const CACHE_NAME = 'hs-atlas-${version}';
const FONT_CACHE = 'hs-atlas-fonts-v1';
const PRECACHE_URLS = ${JSON.stringify(precacheSet, null, 2)};

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

  // Network-first for HTML navigations with per-route offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req, { ignoreSearch: true })
            .then((cached) => cached || caches.match('/index.html') || caches.match('/'))
        )
    );
    return;
  }

  // Cache-first for hashed bundles, icons, OG card, and manifest
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

fs.writeFileSync(path.join(distDir, 'sw.js'), swSource, 'utf8');
console.log(`Generated dist/sw.js (cache hs-atlas-${version}, ${precacheSet.length} precached URLs)`);
