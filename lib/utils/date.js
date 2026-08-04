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

// The exam date changes every year. Configure NEXT_PUBLIC_YKS_DATE after ÖSYM announces it.
export function daysUntilYKS(dateValue = process.env.NEXT_PUBLIC_YKS_DATE) {
  if (!dateValue) return null;
  const now = new Date();
  const yksDate = parseLocalDate(dateValue);
  if (Number.isNaN(yksDate.getTime()) || now > yksDate) return null;
  const diff = yksDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Get current week dates (Mon-Sun)
export function getCurrentWeekDates() {
  const now = new Date();
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
  return toLocalDateKey();
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
