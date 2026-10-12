// Planliyo brand geometry, shared by every asset generator.
// Logo ("Halqa"): the "planliyo" wordmark (Nunito Sans ExtraBold outlined to
// paths, see wordmark-planliyo.json) whose final "o" is a daily-progress ring:
// a soft track with an amber arc filling ~72% of it.
const WORDMARK = require('./wordmark-planliyo.json');

const COLORS = {
  green: '#00A870',
  greenBright: '#14C784',
  greenDeep: '#00704F',
  amber: '#FFC247',
  ink: '#0D1B2A',
  white: '#FFFFFF',
};

const VARIANTS = {
  primary: { text: COLORS.ink, track: 'rgba(0,168,112,0.22)', accent: COLORS.amber },
  white: { text: COLORS.white, track: 'rgba(255,255,255,0.35)', accent: COLORS.amber },
  black: { text: COLORS.ink, track: 'rgba(13,27,42,0.24)', accent: COLORS.ink },
};

const round = (n) => Number(n.toFixed(2));

function arcPath(cx, cy, r, from, to) {
  const point = (a) => [round(cx + r * Math.cos((a * Math.PI) / 180)), round(cy + r * Math.sin((a * Math.PI) / 180))];
  const [x0, y0] = point(from);
  const [x1, y1] = point(to);
  return `M${x0} ${y0} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

// The progress ring on its own (used for small icons).
function ring({ cx = 50, cy = 50, r = 27, w = 21, track, accent }) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${w}"/>`
    + `<path d="${arcPath(cx, cy, r, WORDMARK.ring.from, WORDMARK.ring.to)}" fill="none" stroke="${accent}" stroke-width="${w}" stroke-linecap="round"/>`;
}

// Wordmark in its own units (baseline y=0).
function wordmark({ text, track, accent }) {
  const { ring: o, dot } = WORDMARK;
  return `<path d="${WORDMARK.d}" fill="${text}"/><circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${text}"/>`
    + ring({ cx: o.cx, cy: o.cy, r: o.r, w: o.w, track, accent });
}

// Wordmark placed so that its box is centred on (cx, cy) with the given width.
function placedWordmark({ cx, cy, width, colors }) {
  const { box } = WORDMARK;
  const s = width / (box.x2 - box.x1);
  const tx = cx - ((box.x1 + box.x2) / 2) * s;
  const ty = cy - ((box.y1 + box.y2) / 2) * s;
  return `<g transform="translate(${round(tx)} ${round(ty)}) scale(${round(s * 10000) / 10000})">${wordmark(colors)}</g>`;
}

// Standalone logo SVG (web header, footer, documents).
function logoSvg({ variant = 'primary', height = 96 } = {}) {
  const { box } = WORDMARK;
  const pad = 2;
  const w = box.x2 - box.x1 + pad * 2;
  const h = box.y2 - box.y1 + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round((w / h) * height)}" height="${height}" viewBox="${round(box.x1 - pad)} ${round(box.y1 - pad)} ${round(w)} ${round(h)}">${wordmark(VARIANTS[variant])}</svg>`;
}

const gradient = (id = 'planliyoBg') => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.greenBright}"/><stop offset="1" stop-color="${COLORS.greenDeep}"/></linearGradient>`;

// App-icon style tile (viewBox 100). content: 'word' (launcher icons) or 'ring' (favicons, small sizes).
function tile({ size = 100, radius = 22, content = 'ring', wordWidth = 74, ringScale = 1 } = {}) {
  const inner = content === 'word'
    ? placedWordmark({ cx: 50, cy: 50.8, width: wordWidth, colors: VARIANTS.white })
    : ring({ r: 27 * ringScale, w: 21 * ringScale, track: 'rgba(255,255,255,0.32)', accent: COLORS.amber });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><defs>${gradient()}</defs>`
    + (radius === null ? '' : `<rect width="100" height="100" rx="${radius}" fill="url(#planliyoBg)"/>`)
    + `${inner}</svg>`;
}

module.exports = { COLORS, VARIANTS, WORDMARK, arcPath, ring, wordmark, placedWordmark, logoSvg, gradient, tile };
