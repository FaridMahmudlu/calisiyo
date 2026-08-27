// Format date to Turkish locale
export function formatDate(date) {
  return parseLocalDate(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Format short date
export function formatShortDate(date) {
  return parseLocalDate(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

// Format time (HH:mm)
export function formatTime(time) {
  if (!time) return '';
  return time.slice(0, 5);
}

export function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function toLocalDateKey(value = new Date()) {
  const date = parseLocalDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Product planning estimate; it must remain labelled as estimated until ÖSYM
// publishes the official 2027 exam date. NEXT_PUBLIC_YKS_DATE can override it.
export const YKS_ESTIMATED_DATE = '2027-06-19';
export const APP_TIME_ZONE = 'Europe/Istanbul';

function dateKeyInTimeZone(value = new Date(), timeZone = APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function daysUntilYKS(dateValue = process.env.NEXT_PUBLIC_YKS_DATE || YKS_ESTIMATED_DATE) {
  if (!dateValue) return null;
  const today = todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || today > dateValue) return null;
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  const [targetYear, targetMonth, targetDay] = dateValue.split('-').map(Number);
  const diff = Date.UTC(targetYear, targetMonth - 1, targetDay) - Date.UTC(todayYear, todayMonth - 1, todayDay);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function yksDateLabel(dateValue = process.env.NEXT_PUBLIC_YKS_DATE || YKS_ESTIMATED_DATE) {
  return dateValue ? formatDate(dateValue) : '';
}

// Get current week dates (Mon-Sun)
export function getCurrentWeekDates() {
  const now = parseLocalDate(todayStr());
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// Turkish day names
export const GUN_ISIMLERI = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// Today as YYYY-MM-DD
export function todayStr() {
  return dateKeyInTimeZone();
}

// Format minutes to hours and minutes
export function formatDuration(minutes) {
  if (!minutes) return '0dk';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}sa`;
  return `${h}sa ${m}dk`;
}
