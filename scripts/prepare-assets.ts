import sharp from 'sharp';
await Promise.all([192, 512].map(size => sharp('public/favicon.svg').resize(size, size).png().toFile(`public/pwa-${size}.png`)));
