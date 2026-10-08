// Generates store/app icons from the web brand mark (public/brand/calisiyo-mark.svg).
// Run from mobile/: node scripts/generate-brand-assets.cjs
const path = require('path');
const sharp = require(path.resolve(__dirname, '../../node_modules/sharp'));

const GREEN = '#00A870';
const out = (name) => path.resolve(__dirname, '../assets/images', name);

const glyph = (scale, { mono = false } = {}) => `
  <g transform="translate(48 48) scale(${scale}) translate(-48 -53)">
    <path fill="#FFFFFF" d="M18 26.7c11.8-2.7 21.8-.7 30 6.1v39.4c-7.5-5.5-16.6-7.3-27.4-5.1A3 3 0 0 1 17 64.2V30.6a4 4 0 0 1 1-3.9Z"/>
    <path fill="${mono ? '#FFFFFF' : '#E5FFF5'}" d="M78 26.7c-11.8-2.7-21.8-.7-30 6.1v39.4c7.5-5.5 16.6-7.3 27.4-5.1a3 3 0 0 0 3.6-2.9V30.6a4 4 0 0 0-1-3.9Z"/>
    ${mono ? '' : '<path d="m34.6 47.7 9.2 9.2 18-20.4" fill="none" stroke="#0B3B2E" stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>'}
    <path d="M18.5 72.2c11.9-2.4 21.7.2 29.5 7.1 7.8-6.9 17.6-9.5 29.5-7.1" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
  </g>`;

const svg = (body, background = '') => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">${background}${body}</svg>`
);

const fullBleed = `<rect width="96" height="96" fill="${GREEN}"/>`;
const roundedMark = `<rect x="2" y="2" width="92" height="92" rx="25" fill="${GREEN}"/>`;

async function render(buffer, size, file) {
  await sharp(buffer, { density: 1200 }).resize(size, size).png().toFile(out(file));
  console.log('wrote', file);
}

(async () => {
  await render(svg(glyph(1), fullBleed), 1024, 'icon.png');
  await render(svg(glyph(0.62)), 1024, 'android-icon-foreground.png');
  await render(svg('', fullBleed), 1024, 'android-icon-background.png');
  await render(svg(glyph(0.62, { mono: true })), 1024, 'android-icon-monochrome.png');
  await render(svg(glyph(1), roundedMark), 1024, 'splash-icon.png');
  await render(svg(glyph(1), roundedMark), 196, 'favicon.png');
  await render(svg(glyph(1.05, { mono: true })), 96, 'notification-icon.png');
})();
