// SVG artwork for Android home-screen widgets (rendered natively by SvgWidget).
// Mirrors the logo's progress ring: green-to-amber arc on a translucent track.

export const DAILY_GOAL_MINUTES = 30;

export function progressRing(pct: number, size: number, stroke: number) {
  const c = size / 2;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const arc = Math.max(0, Math.min(1, pct)) * length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="${stroke}"/>
  ${arc > 0 ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#FFC247" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${arc} ${length}" transform="rotate(-90 ${c} ${c})"/>` : ''}
</svg>`;
}

// Play button inside today's progress ring (Hızlı Odak widget).
export function focusButton(pct: number, size: number) {
  const c = size / 2;
  const stroke = Math.round(size * 0.08);
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const arc = Math.max(0, Math.min(1, pct)) * length;
  const disc = r - stroke * 1.1;
  const t = disc * 0.42;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14C784"/><stop offset="1" stop-color="#00704F"/></linearGradient></defs>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="${stroke}"/>
  ${arc > 0 ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#FFC247" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${arc} ${length}" transform="rotate(-90 ${c} ${c})"/>` : ''}
  <circle cx="${c}" cy="${c}" r="${disc}" fill="url(#g)"/>
  <path d="M${c - t * 0.55} ${c - t} L${c + t} ${c} L${c - t * 0.55} ${c + t} Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${stroke * 0.5}" stroke-linejoin="round"/>
</svg>`;
}
