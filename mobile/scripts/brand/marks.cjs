// Calisiyo brand geometry, shared by every asset generator.
// Mark ("Yol"): the lowercase "c" is a road — the study journey — that starts
// at a dot and ends at a goal flag. viewBox 0 0 100 100.
// Wordmark: "calisiyo" in Nunito Sans ExtraBold, outlined to paths so it never
// depends on installed fonts. Baseline y=0, box x 3.4..333, y -72.7..18.
const COLORS = {
  green: '#00A870',
  greenBright: '#14C784',
  greenDeep: '#00704F',
  amber: '#FFC247',
  ink: '#0D1B2A',
  white: '#FFFFFF',
};

const ROAD = 'M68.06 34.93 A27 27 0 1 0 68.06 71.07';

// `detail: false` drops the lane dashes for tiny sizes (favicons, notification).
function mark({ road = COLORS.white, lane = COLORS.green, flag = COLORS.amber, pole = road, detail = true } = {}) {
  return [
    `<path d="${ROAD}" fill="none" stroke="${road}" stroke-width="17" stroke-linecap="round"/>`,
    detail ? `<path d="${ROAD}" fill="none" stroke="${lane}" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="2.6 8.24" stroke-dashoffset="6.72"/>` : '',
    detail ? `<circle cx="68.06" cy="71.07" r="3.6" fill="${lane}"/>` : '',
    `<path d="M68.06 36 V11.2" stroke="${pole}" stroke-width="3.4" stroke-linecap="round"/>`,
    `<path d="M69.6 11.6 C74.6 9.6 78.6 14.4 85.6 12 V24.6 C78.6 27 74.6 22.2 69.6 24.2 Z" fill="${flag}"/>`,
  ].join('');
}

const gradient = (id = 'calisiyoBg') => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.greenBright}"/><stop offset="1" stop-color="${COLORS.greenDeep}"/></linearGradient>`;

// App-icon style tile. `scale` shrinks the mark inside the tile; `radius` 0 = full bleed.
function tile({ size = 100, scale = 0.86, radius = 22, detail = true, background = 'gradient' } = {}) {
  const fill = background === 'gradient' ? 'url(#calisiyoBg)' : background;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><defs>${gradient()}</defs>`
    + (background ? `<rect width="100" height="100" rx="${radius}" fill="${fill}"/>` : '')
    + `<g transform="translate(50 50) scale(${scale}) translate(-49 -50)">${mark({ detail })}</g></svg>`;
}

const WORDMARK = { d: 'M29.70 1.10L29.70 1.10Q21.70 1.10 15.75-2.05Q9.80-5.20 6.60-11Q3.40-16.80 3.40-24.70L3.40-24.70Q3.40-32.60 6.60-38.30Q9.80-44 15.75-47.05Q21.70-50.10 29.70-50.10L29.70-50.10Q34.50-50.10 39.25-48.70Q44-47.30 47-44.70L47-44.70L42.80-34.30Q40.40-36.30 37.20-37.45Q34-38.60 31.20-38.60L31.20-38.60Q25.30-38.60 22.05-34.95Q18.80-31.30 18.80-24.60L18.80-24.60Q18.80-18 22.05-14.25Q25.30-10.50 31.20-10.50L31.20-10.50Q34-10.50 37.20-11.60Q40.40-12.70 42.80-14.80L42.80-14.80L47-4.40Q44-1.90 39.20-0.40Q34.40 1.10 29.70 1.10ZM68 1.10L68 1.10Q62.60 1.10 58.30-1Q54-3.10 51.60-6.70Q49.20-10.30 49.20-14.80L49.20-14.80Q49.20-20.20 52-23.35Q54.80-26.50 61.10-27.85Q67.40-29.20 77.80-29.20L77.80-29.20L83.10-29.20L83.10-21.40L77.90-21.40Q74-21.40 71.35-21.10Q68.70-20.80 67-20.05Q65.30-19.30 64.55-18.20Q63.80-17.10 63.80-15.40L63.80-15.40Q63.80-12.60 65.75-10.80Q67.70-9 71.40-9L71.40-9Q74.30-9 76.55-10.35Q78.80-11.70 80.10-14.05Q81.40-16.40 81.40-19.40L81.40-19.40L81.40-30.90Q81.40-35.30 79.40-37.15Q77.40-39 72.60-39L72.60-39Q68.60-39 64.15-37.75Q59.70-36.50 55.30-34L55.30-34L51.20-44.10Q53.80-45.90 57.55-47.25Q61.30-48.60 65.40-49.35Q69.50-50.10 73.20-50.10L73.20-50.10Q80.90-50.10 85.85-47.85Q90.80-45.60 93.30-40.95Q95.80-36.30 95.80-29L95.80-29L95.80 0L81.70 0L81.70-9.90L82.40-9.90Q81.80-6.50 79.85-4.05Q77.90-1.60 74.90-0.25Q71.90 1.10 68 1.10ZM123.20 1.10L123.20 1.10Q113.70 1.10 109.30-3.85Q104.90-8.80 104.90-18.60L104.90-18.60L104.90-70.50L120-70.50L120-19.20Q120-16.70 120.80-14.85Q121.60-13 123.15-12.10Q124.70-11.20 127.10-11.20L127.10-11.20Q128.10-11.20 129.20-11.30Q130.30-11.40 131.30-11.70L131.30-11.70L131.10 0Q129.20 0.50 127.25 0.80Q125.30 1.10 123.20 1.10ZM151.70-58.60L135.40-58.60L135.40-72.70L151.70-72.70L151.70-58.60ZM151.10 0L136 0L136-49.10L151.10-49.10L151.10 0ZM179.40 1.10L179.40 1.10Q175.10 1.10 171.10 0.40Q167.10-0.30 163.80-1.50Q160.50-2.70 158.00-4.50L158.00-4.50L161.60-14.30Q164.10-12.80 167.05-11.65Q170.00-10.50 173.20-9.90Q176.40-9.30 179.50-9.30L179.50-9.30Q183.80-9.30 185.75-10.65Q187.70-12 187.70-14.20L187.70-14.20Q187.70-16.20 186.40-17.20Q185.10-18.20 182.60-18.60L182.60-18.60L172.10-20.50Q165.90-21.60 162.55-25.05Q159.20-28.50 159.20-33.90L159.20-33.90Q159.20-38.90 162.00-42.55Q164.80-46.20 169.75-48.15Q174.70-50.10 181-50.10L181-50.10Q184.60-50.10 188-49.50Q191.40-48.90 194.45-47.70Q197.50-46.50 199.90-44.50L199.90-44.50L196.10-34.80Q194.20-36.30 191.60-37.40Q189-38.50 186.30-39.15Q183.60-39.80 181.20-39.80L181.20-39.80Q176.70-39.80 174.70-38.35Q172.70-36.90 172.70-34.70L172.70-34.70Q172.70-33 173.85-31.85Q175-30.70 177.40-30.30L177.40-30.30L187.90-28.40Q194.40-27.30 197.80-24.05Q201.20-20.80 201.20-15.20L201.20-15.20Q201.20-10.10 198.50-6.45Q195.80-2.80 190.90-0.85Q186 1.10 179.40 1.10ZM223.30-58.60L207.00-58.60L207.00-72.70L223.30-72.70L223.30-58.60ZM222.70 0L207.60 0L207.60-49.10L222.70-49.10L222.70 0ZM251.40 18L236.00 18L246.80-5.70L246.80 0.50L225.20-49.10L241.10-49.10L255.00-13.90L251.80-13.90L266.10-49.10L281.10-49.10L251.40 18ZM306.90 1.10L306.90 1.10Q299 1.10 293.15-2Q287.30-5.10 284.10-10.90Q280.90-16.70 280.90-24.60L280.90-24.60Q280.90-32.50 284.10-38.20Q287.30-43.90 293.15-47Q299-50.10 306.90-50.10L306.90-50.10Q314.80-50.10 320.65-47Q326.50-43.90 329.75-38.15Q333-32.40 333-24.60L333-24.60Q333-16.70 329.75-10.90Q326.50-5.10 320.65-2Q314.80 1.10 306.90 1.10ZM306.90-10.20L306.90-10.20Q311.80-10.20 314.80-13.75Q317.80-17.30 317.80-24.60L317.80-24.60Q317.80-31.90 314.80-35.35Q311.80-38.80 306.90-38.80L306.90-38.80Q302.10-38.80 299.10-35.35Q296.10-31.90 296.10-24.60L296.10-24.60Q296.10-17.30 299.10-13.75Q302.10-10.20 306.90-10.20Z', x1: 3.4, y1: -72.7, x2: 333, y2: 18 };

// Horizontal lockup: mark (on tile or bare) + wordmark.
// variant: 'primary' (green mark, ink text), 'white' (for dark/green backgrounds), 'black'.
function lockup({ variant = 'primary', height = 96 } = {}) {
  const text = variant === 'white' ? COLORS.white : COLORS.ink;
  const road = variant === 'primary' ? COLORS.green : variant === 'white' ? COLORS.white : COLORS.ink;
  const lane = variant === 'primary' ? COLORS.white : variant === 'white' ? COLORS.greenDeep : COLORS.white;
  const flag = variant === 'black' ? COLORS.ink : COLORS.amber;
  // Mark occupies 100x100 at x 0; wordmark scaled to cap height ~56 and aligned to the mark's optical center.
  const s = 0.62;
  const wx = 104;
  const wy = 50 + (72.7 * s - 18 * s) / 2 + 2;
  const width = wx + WORDMARK.x2 * s + 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${Math.round((width / 100) * height)}" viewBox="0 0 ${width.toFixed(1)} 100">`
    + `<g transform="translate(1 0)">${mark({ road, lane, flag })}</g>`
    + `<path transform="translate(${wx} ${wy.toFixed(2)}) scale(${s})" d="${WORDMARK.d}" fill="${text}"/></svg>`;
}

module.exports = { COLORS, ROAD, mark, gradient, tile, lockup, WORDMARK };
