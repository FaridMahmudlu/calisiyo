// Generates Google Play listing graphics into mobile/store-assets/:
//   play-icon-512.png (512x512) and play-feature-graphic.png (1024x500).
// Run from mobile/: node scripts/generate-store-assets.cjs
const fs = require('fs');
const path = require('path');
const sharp = require(path.resolve(__dirname, '../../node_modules/sharp'));

const GREEN = '#00A870';
const DARK = '#0B3B2E';
const outDir = path.resolve(__dirname, '../store-assets');
fs.mkdirSync(outDir, { recursive: true });

const glyph = `
  <path fill="#FFFFFF" d="M18 26.7c11.8-2.7 21.8-.7 30 6.1v39.4c-7.5-5.5-16.6-7.3-27.4-5.1A3 3 0 0 1 17 64.2V30.6a4 4 0 0 1 1-3.9Z"/>
  <path fill="#E5FFF5" d="M78 26.7c-11.8-2.7-21.8-.7-30 6.1v39.4c7.5-5.5 16.6-7.3 27.4-5.1a3 3 0 0 0 3.6-2.9V30.6a4 4 0 0 0-1-3.9Z"/>
  <path d="m34.6 47.7 9.2 9.2 18-20.4" fill="none" stroke="${DARK}" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M18.5 72.2c11.9-2.4 21.7.2 29.5 7.1 7.8-6.9 17.6-9.5 29.5-7.1" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>`;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" fill="${GREEN}"/>
  <g transform="translate(48 48) translate(-48 -53)">${glyph}</g>
</svg>`;

const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#00B87A"/><stop offset="1" stop-color="#007A55"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <circle cx="900" cy="80" r="190" fill="#FFFFFF" opacity="0.06"/>
  <circle cx="960" cy="470" r="150" fill="#FFFFFF" opacity="0.05"/>
  <g transform="translate(96 110) scale(2.9)">
    <rect x="2" y="2" width="92" height="92" rx="25" fill="#FFFFFF" opacity="0.16"/>
    <g transform="translate(0 -5)">${glyph}</g>
  </g>
  <text x="420" y="215" font-family="Segoe UI, Arial, sans-serif" font-size="84" font-weight="800" fill="#FFFFFF">calisiyo</text>
  <text x="424" y="285" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="600" fill="#E5FFF5">YKS çalışma koçun</text>
  <text x="424" y="340" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#D2F5E7">Program · Kronometre · Deneme · Sınıflar</text>
</svg>`;

(async () => {
  await sharp(Buffer.from(icon), { density: 1200 }).resize(512, 512).png().toFile(path.join(outDir, 'play-icon-512.png'));
  await sharp(Buffer.from(feature), { density: 144 }).resize(1024, 500).png().toFile(path.join(outDir, 'play-feature-graphic.png'));
  console.log('wrote store-assets/play-icon-512.png and store-assets/play-feature-graphic.png');
})();
