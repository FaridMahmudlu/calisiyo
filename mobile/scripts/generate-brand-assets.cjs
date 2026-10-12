// Generates every Planliyo brand asset (mobile app icons, web favicons/PWA/OG,
// store graphics, the React Native wordmark module) from the single geometry
// source in ./brand/marks.cjs.
// Run from mobile/: node scripts/generate-brand-assets.cjs
const fs = require('fs');
const path = require('path');
const sharp = require(path.resolve(__dirname, '../../node_modules/sharp'));
const { COLORS, VARIANTS, WORDMARK, arcPath, ring, placedWordmark, logoSvg, gradient, tile } = require('./brand/marks.cjs');

const mobileOut = (name) => path.resolve(__dirname, '../assets/images', name);
const webOut = (name) => path.resolve(__dirname, '../../public/brand', name);
const storeOut = (name) => path.resolve(__dirname, '../store-assets', name);
fs.mkdirSync(path.resolve(__dirname, '../store-assets'), { recursive: true });

// Rasterize at 2x the target size, whatever the SVG's intrinsic width is.
const densityFor = (svgText, size) => Math.ceil((72 * size * 2) / Number(/width="(\d+(?:\.\d+)?)"/.exec(svgText)?.[1] || 100));
const png = (svgText, size, file) => sharp(Buffer.from(svgText), { density: densityFor(svgText, size) }).resize(size, size).png().toFile(file);
const canvas = (inner, size = 100) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><defs>${gradient()}</defs>${inner}</svg>`;

// ICO container with embedded PNG images (supported by all modern browsers).
async function writeIco(file, sizes) {
  const images = await Promise.all(sizes.map((size) => {
    const svgText = tile({ size, content: 'ring', ringScale: size < 32 ? 1.1 : 1 });
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

// Large decorative progress ring used as a background motif.
const motif = ({ cx, cy, r, w, track, accent }) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${w}"/>`
  + `<path d="${arcPath(cx, cy, r, WORDMARK.ring.from, WORDMARK.ring.to)}" fill="none" stroke="${accent}" stroke-width="${w}" stroke-linecap="round"/>`;

function featureGraphic() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500"><defs>${gradient('fg')}</defs>
    <rect width="1024" height="500" fill="url(#fg)"/>
    ${motif({ cx: 900, cy: 250, r: 190, w: 92, track: 'rgba(255,255,255,0.10)', accent: 'rgba(255,194,71,0.85)' })}
    ${placedWordmark({ cx: 372, cy: 214, width: 560, colors: VARIANTS.white })}
    <text x="94" y="338" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="600" fill="#E3FFF2">YKS çalışma koçun</text>
  </svg>`;
}

function ogImage() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#F6FBF8"/>
    ${motif({ cx: 1070, cy: 300, r: 220, w: 104, track: 'rgba(0,168,112,0.09)', accent: 'rgba(255,194,71,0.75)' })}
    ${placedWordmark({ cx: 410, cy: 220, width: 600, colors: VARIANTS.primary })}
    <text x="112" y="400" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700" fill="${COLORS.ink}">Planla. Odaklan. Gerçek kayıtlarla ilerle.</text>
    <text x="112" y="458" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="500" fill="#566476">YKS çalışma programı, kronometre, deneme analizi ve çalışma sınıfları</text>
    <text x="112" y="540" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" fill="${COLORS.green}">planliyo.com.tr</text>
  </svg>`;
}

// Widget-picker previews mirroring the Android widgets in src/widgets/TodayWidgetAndroid.tsx.
const FONT = 'font-family="Segoe UI, Roboto, Arial, sans-serif"';
const flame = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" fill="#FFC247" d="M12 2c1 3.6-1.6 5.3-1.6 8.1 0 1.4.9 2.5 2.2 2.5 1.6 0 2.4-1.4 2.1-3.2C17.4 11 19 13.4 19 16a7 7 0 0 1-14 0c0-4.2 3.1-6.6 4.6-9.2C10.8 4.9 11.8 3.6 12 2Z"/>`;
const previewRing = (cx, cy, r, w, pct) => {
  const c = 2 * Math.PI * r;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="${w}"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FFC247" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${c * pct} ${c}" transform="rotate(-90 ${cx} ${cy})"/>`;
};

function todayWidgetPreview() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
    <defs><linearGradient id="tw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#12C383"/><stop offset="1" stop-color="#00704F"/></linearGradient></defs>
    <rect width="600" height="340" rx="52" fill="url(#tw)"/>
    ${previewRing(104, 112, 62, 15, 0.6)}
    <text x="104" y="116" text-anchor="middle" ${FONT} font-size="44" font-weight="800" fill="#FFFFFF">18</text>
    <text x="104" y="146" text-anchor="middle" ${FONT} font-size="19" fill="#DDFBEE">/ 30 dk</text>
    ${flame(200, 62, 1.6)}
    <text x="242" y="94" ${FONT} font-size="34" font-weight="800" fill="#FFFFFF">12 gün seri</text>
    <text x="202" y="134" ${FONT} font-size="24" fill="#DDFBEE">3/5 görev · Seviye 4</text>
    <text x="202" y="176" ${FONT} font-size="24" fill="#FFFFFF">Sıradaki: 17:00 · Matematik</text>
    <rect x="34" y="242" width="216" height="62" rx="31" fill="#FFFFFF"/>
    <path d="M66 258 L66 288 L90 273 Z" fill="#00704F"/>
    <text x="102" y="282" ${FONT} font-size="24" font-weight="800" fill="#00704F">Odak başlat</text>
    <rect x="266" y="242" width="216" height="62" rx="31" fill="#FFFFFF" fill-opacity="0.2"/>
    <text x="374" y="282" text-anchor="middle" ${FONT} font-size="24" font-weight="700" fill="#FFFFFF">Bugünkü plan</text>
  </svg>`;
}

function quickFocusPreview() {
  const c = 170;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="340" viewBox="0 0 340 340">
    <defs>
      <linearGradient id="qn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17322C"/><stop offset="1" stop-color="#0A1513"/></linearGradient>
      <linearGradient id="qb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14C784"/><stop offset="1" stop-color="#00704F"/></linearGradient>
    </defs>
    <rect width="340" height="340" rx="52" fill="url(#qn)"/>
    ${previewRing(c, 128, 70, 11, 0.6)}
    <circle cx="${c}" cy="128" r="56" fill="url(#qb)"/>
    <path d="M${c - 14} 104 L${c + 26} 128 L${c - 14} 152 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round"/>
    <text x="${c}" y="252" text-anchor="middle" ${FONT} font-size="32" font-weight="800" fill="#FFFFFF">Odak başlat</text>
    <text x="${c}" y="290" text-anchor="middle" ${FONT} font-size="22" fill="#8FE3BF">Bugün 18 dk · 12 gün seri</text>
  </svg>`;
}

// React Native module with the same geometry (no runtime font dependency).
function writeNativeWordmark() {
  const { d, dot, ring: o, box } = WORDMARK;
  const file = path.resolve(__dirname, '../src/components/brand/wordmark.ts');
  fs.writeFileSync(file, `// Generated by scripts/generate-brand-assets.cjs from scripts/brand/wordmark-planliyo.json. Do not edit.\n`
    + `export const WORDMARK = {\n`
    + `  d: '${d}',\n`
    + `  dot: { cx: ${dot.cx}, cy: ${dot.cy}, r: ${dot.r} },\n`
    + `  ring: { cx: ${o.cx}, cy: ${o.cy}, r: ${o.r}, w: ${o.w} },\n`
    + `  arc: '${arcPath(o.cx, o.cy, o.r, o.from, o.to)}',\n`
    + `  box: { x: ${box.x1}, y: ${box.y1}, width: ${Number((box.x2 - box.x1).toFixed(2))}, height: ${Number((box.y2 - box.y1).toFixed(2))} },\n`
    + `} as const;\n\n`
    + `// Progress ring alone in a 100x100 box (app-icon style mark).\n`
    + `export const RING_ARC = '${arcPath(50, 50, 27, o.from, o.to)}';\n`);
}

(async () => {
  // Mobile app (Expo)
  await png(tile({ size: 1024, radius: 0, content: 'word', wordWidth: 74 }), 1024, mobileOut('icon.png'));
  await png(canvas(placedWordmark({ cx: 50, cy: 50.8, width: 58, colors: VARIANTS.white })), 1024, mobileOut('android-icon-foreground.png'));
  await png(canvas('<rect width="100" height="100" fill="url(#planliyoBg)"/>'), 1024, mobileOut('android-icon-background.png'));
  await png(canvas(ring({ r: 16.7, w: 13, track: 'rgba(255,255,255,0.45)', accent: '#FFFFFF' })), 1024, mobileOut('android-icon-monochrome.png'));
  await png(canvas(placedWordmark({ cx: 50, cy: 50, width: 62, colors: VARIANTS.primary })), 1024, mobileOut('splash-icon.png'));
  await png(canvas(placedWordmark({ cx: 50, cy: 50, width: 62, colors: VARIANTS.white })), 1024, mobileOut('splash-icon-dark.png'));
  await png(tile({ size: 196, content: 'ring' }), 196, mobileOut('favicon.png'));
  await png(canvas(ring({ r: 30, w: 22, track: 'rgba(255,255,255,0.45)', accent: '#FFFFFF' })), 96, mobileOut('notification-icon.png'));
  writeNativeWordmark();

  // Android widget picker previews
  const widgetOut = (name) => path.resolve(__dirname, '../assets/widgets', name);
  fs.mkdirSync(path.resolve(__dirname, '../assets/widgets'), { recursive: true });
  await sharp(Buffer.from(todayWidgetPreview()), { density: 144 }).resize(600, 340).png().toFile(widgetOut('today-preview.png'));
  await sharp(Buffer.from(quickFocusPreview()), { density: 144 }).resize(340, 340).png().toFile(widgetOut('quick-focus-preview.png'));

  // Web
  fs.writeFileSync(webOut('planliyo-logo.svg'), logoSvg({ variant: 'primary' }));
  fs.writeFileSync(webOut('planliyo-logo-white.svg'), logoSvg({ variant: 'white' }));
  fs.writeFileSync(webOut('planliyo-logo-black.svg'), logoSvg({ variant: 'black' }));
  fs.writeFileSync(webOut('planliyo-mark.svg'), tile({ size: 512, content: 'ring' }));
  fs.writeFileSync(webOut('planliyo-monogram.svg'), tile({ size: 64, content: 'ring' }));
  await png(tile({ size: 512, radius: 0, content: 'word', wordWidth: 70 }), 512, webOut('planliyo-mark-512.png'));
  await png(tile({ size: 192, radius: 0, content: 'word', wordWidth: 70 }), 192, webOut('planliyo-mark-192.png'));
  await png(tile({ size: 180, radius: 0, content: 'word', wordWidth: 74 }), 180, webOut('apple-touch-icon.png'));
  for (const size of [16, 32, 48]) {
    const svgText = tile({ size, content: 'ring', ringScale: size < 32 ? 1.1 : 1 });
    await png(svgText, size, webOut(`favicon-${size}x${size}.png`));
    await png(svgText, size, webOut(`favicon-${size}.png`));
  }
  await writeIco(path.resolve(__dirname, '../../app/favicon.ico'), [16, 32, 48]);
  await writeIco(path.resolve(__dirname, '../../public/favicon.ico'), [16, 32, 48]);
  await sharp(Buffer.from(ogImage()), { density: 144 }).resize(1200, 630).png().toFile(webOut('og-image.png'));

  // Store listings and OAuth consent screen
  await png(tile({ size: 512, radius: 0, content: 'word', wordWidth: 74 }), 512, storeOut('play-icon-512.png'));
  await sharp(Buffer.from(featureGraphic()), { density: 144 }).resize(1024, 500).png().toFile(storeOut('play-feature-graphic.png'));
  await png(tile({ size: 120, radius: 0, content: 'ring' }), 120, storeOut('google-oauth-logo-120.png'));
  console.log('Brand assets generated.');
})();
