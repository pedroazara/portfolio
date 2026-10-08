import sharp from 'sharp';
await Promise.all([
  { size: 180, filename: 'apple-touch-icon.png' },
  { size: 192, filename: 'pwa-192.png' },
  { size: 512, filename: 'pwa-512.png' },
].map(({ size, filename }) => sharp('public/favicon.svg').resize(size, size).png().toFile(`public/${filename}`)));
