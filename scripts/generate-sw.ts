import { generateSW } from 'workbox-build';
const result = await generateSW({
  globDirectory: 'dist', swDest: 'dist/sw.js',
  globPatterns: ['assets/**/*.{js,css,woff2}', 'offline.html', 'pwa-*.png', 'favicon.svg', 'site.webmanifest'],
  maximumFileSizeToCacheInBytes: 5000000, cleanupOutdatedCaches: true,
  skipWaiting: false, clientsClaim: true,
  runtimeCaching: [
    { urlPattern: ({ request, url }) => request.mode === 'navigate' && url.origin === self.location.origin && !/^\/(en\/)?admin/.test(url.pathname) && (!url.search || (/^\/(projetos|en\/projects)\/?$/.test(url.pathname) && [...url.searchParams.keys()].every(key => ['q', 'category', 'sort'].includes(key)))),
      handler: 'NetworkFirst', options: { cacheName: 'portfolio-pages', networkTimeoutSeconds: 4, precacheFallback: { fallbackURL: '/offline.html' }, expiration: { maxEntries: 30, maxAgeSeconds: 604800 }, cacheableResponse: { statuses: [200] } } },
    { urlPattern: ({ request, url }) => request.destination === 'image' && (url.origin === self.location.origin || url.hostname.endsWith('.supabase.co')) && !url.pathname.includes('/object/sign/'),
      handler: 'CacheFirst', options: { cacheName: 'portfolio-images', expiration: { maxEntries: 80, maxAgeSeconds: 86400 }, cacheableResponse: { statuses: [0, 200] } } },
  ],
});
console.log(`Offline: ${result.count} static assets prepared.`);
