// Format date to Turkish locale
export function formatDate(date) {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Format short date
export function formatShortDate(date) {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

// Format time (HH:mm)
export function formatTime(time) {
  if (!time) return '';
  return time.slice(0, 5);
}

// Days until YKS (usually mid-June)
export function daysUntilYKS() {
  const now = new Date();
  let yksDate = new Date(now.getFullYear(), 5, 14); // June 14
  if (now > yksDate) {
    yksDate = new Date(now.getFullYear() + 1, 5, 14);
  }
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
  return new Date().toISOString().split('T')[0];
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
