// Generates every Calisiyo brand asset (mobile app icons, web favicons/PWA/OG,
// Play Store graphics) from the single geometry source in ./brand/marks.cjs.
// Run from mobile/: node scripts/generate-brand-assets.cjs
const fs = require('fs');
const path = require('path');
const sharp = require(path.resolve(__dirname, '../../node_modules/sharp'));
const { COLORS, mark, gradient, tile, lockup, WORDMARK } = require('./brand/marks.cjs');

const mobileOut = (name) => path.resolve(__dirname, '../assets/images', name);
const webOut = (name) => path.resolve(__dirname, '../../public/brand', name);
const storeOut = (name) => path.resolve(__dirname, '../store-assets', name);
fs.mkdirSync(path.resolve(__dirname, '../store-assets'), { recursive: true });

// Rasterize at 2x the target size, whatever the SVG's intrinsic width is.
const densityFor = (svgText, size) => Math.ceil((72 * size * 2) / Number(/width="(\d+(?:\.\d+)?)"/.exec(svgText)?.[1] || 100));
const png = (svgText, size, file) => sharp(Buffer.from(svgText), { density: densityFor(svgText, size) }).resize(size, size).png().toFile(file);
const bare = (inner, size = 100) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><defs>${gradient()}</defs>${inner}</svg>`;
const centered = (scale, options) => `<g transform="translate(50 50) scale(${scale}) translate(-49 -50)">${mark(options)}</g>`;

// ICO container with embedded PNG images (supported by all modern browsers).
async function writeIco(file, sizes) {
  const images = await Promise.all(sizes.map((size) => {
    const svgText = tile({ size, radius: 22, detail: size >= 32, scale: size >= 32 ? 0.86 : 0.92 });
    return sharp(Buffer.from(svgText), { density: densityFor(svgText, size) }).resize(size, size).png().toBuffer();
  }));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(sizes[index] >= 256 ? 0 : sizes[index], entry);
    header.writeUInt8(sizes[index] >= 256 ? 0 : sizes[index], entry + 1);
    header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  fs.writeFileSync(file, Buffer.concat([header, ...images]));
}

function featureGraphic() {
  const s = 0.86;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500"><defs>${gradient('fg')}</defs>
    <rect width="1024" height="500" fill="url(#fg)"/>
    <circle cx="930" cy="40" r="210" fill="#FFFFFF" opacity="0.06"/><circle cx="990" cy="500" r="170" fill="#FFFFFF" opacity="0.05"/>
    <g transform="translate(90 95) scale(3.1)"><rect x="0" y="0" width="100" height="100" rx="24" fill="#FFFFFF" opacity="0.14"/>${centered(0.86, { lane: COLORS.greenDeep })}</g>
    <path transform="translate(440 262) scale(${s * 1.25})" d="${WORDMARK.d}" fill="#FFFFFF"/>
    <text x="446" y="338" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="600" fill="#E3FFF2">YKS çalışma koçun</text>
  </svg>`;
}

function ogImage() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs>${gradient('og')}</defs>
    <rect width="1200" height="630" fill="#F6FBF8"/>
    <circle cx="1080" cy="80" r="260" fill="${COLORS.green}" opacity="0.07"/><circle cx="1150" cy="620" r="200" fill="${COLORS.amber}" opacity="0.10"/>
    <g transform="translate(110 150) scale(1.6)"><rect width="100" height="100" rx="24" fill="url(#og)"/>${centered(0.86)}</g>
    <path transform="translate(300 268) scale(1.18)" d="${WORDMARK.d}" fill="${COLORS.ink}"/>
    <text x="114" y="440" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700" fill="${COLORS.ink}">Planla. Odaklan. Gerçek kayıtlarla ilerle.</text>
    <text x="114" y="500" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="500" fill="#566476">YKS çalışma programı, kronometre, deneme analizi ve çalışma sınıfları</text>
  </svg>`;
}

(async () => {
  // Mobile app (Expo)
  await png(tile({ size: 1024, radius: 0, scale: 0.8 }), 1024, mobileOut('icon.png'));
  await png(bare(centered(0.56)), 1024, mobileOut('android-icon-foreground.png'));
  await png(bare('<rect width="100" height="100" fill="url(#calisiyoBg)"/>'), 1024, mobileOut('android-icon-background.png'));
  await png(bare(centered(0.56, { detail: false, flag: '#FFFFFF' })), 1024, mobileOut('android-icon-monochrome.png'));
  await png(tile({ size: 1024, radius: 24, scale: 0.84 }), 1024, mobileOut('splash-icon.png'));
  await png(tile({ size: 196, radius: 22 }), 196, mobileOut('favicon.png'));
  await png(bare(centered(0.98, { detail: false, flag: '#FFFFFF' })), 96, mobileOut('notification-icon.png'));

  // Web
  fs.writeFileSync(webOut('calisiyo-mark.svg'), tile({ size: 512 }));
  fs.writeFileSync(webOut('calisiyo-monogram.svg'), tile({ size: 64 }));
  fs.writeFileSync(webOut('calisiyo-logo.svg'), lockup({ variant: 'primary' }));
  fs.writeFileSync(webOut('calisiyo-logo-white.svg'), lockup({ variant: 'white' }));
  fs.writeFileSync(webOut('calisiyo-logo-black.svg'), lockup({ variant: 'black' }));
  await png(tile({ size: 512, radius: 0, scale: 0.78 }), 512, webOut('calisiyo-mark-512.png'));
  await png(tile({ size: 192, radius: 0, scale: 0.78 }), 192, webOut('calisiyo-mark-192.png'));
  await png(tile({ size: 180, radius: 0, scale: 0.8 }), 180, webOut('apple-touch-icon.png'));
  for (const size of [16, 32, 48]) {
    const svgText = tile({ size, radius: 22, detail: size >= 32, scale: size >= 32 ? 0.86 : 0.92 });
    await png(svgText, size, webOut(`favicon-${size}x${size}.png`));
    await png(svgText, size, webOut(`favicon-${size}.png`));
  }
  await writeIco(path.resolve(__dirname, '../../app/favicon.ico'), [16, 32, 48]);
  await writeIco(path.resolve(__dirname, '../../public/favicon.ico'), [16, 32, 48]);
  await sharp(Buffer.from(ogImage()), { density: 144 }).resize(1200, 630).png().toFile(webOut('og-image.png'));

  // Google Play listing
  await png(tile({ size: 512, radius: 0, scale: 0.8 }), 512, storeOut('play-icon-512.png'));
  await sharp(Buffer.from(featureGraphic()), { density: 144 }).resize(1024, 500).png().toFile(storeOut('play-feature-graphic.png'));
  console.log('Brand assets generated.');
})();
