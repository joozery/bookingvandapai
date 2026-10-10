const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..', 'public');
const files = [
  'cover.png',
  ['logo/logo.png', 'logo/logo-png.webp'],
  'logo/scenic_van_trip.png',
  'logo/logov2.png',
  ['logo/logo.jpg', 'logo/logo-jpg.webp'],
  'cover_small.jpg',
];

(async () => {
  for (const entry of files) {
    const [relativePath, outputPath] = Array.isArray(entry) ? entry : [entry, null];
    const source = path.join(root, relativePath);
    const target = outputPath ? path.join(root, outputPath) : source.replace(/\.(png|jpe?g)$/i, '.webp');
    await sharp(source).webp({ quality: 82, effort: 5 }).toFile(target);
    console.log(`${relativePath} -> ${path.relative(root, target)}`);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
