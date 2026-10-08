import type { Href } from 'expo-router';

// Notifications and server data reference web paths (/dashboard/...). Mobile
// routes use the same slugs so links resolve one-to-one.
const TAB_ROUTES: Record<string, string> = {
  '/dashboard': '/',
  '/dashboard/gunluk-program': '/program',
  '/dashboard/pomodoro': '/kronometre',
  '/dashboard/arkadaslar': '/arkadaslar',
};

export function appRouteFromWebPath(path?: string | null): Href | null {
  if (!path || typeof path !== 'string') return null;
  let pathname = path;
  try { pathname = new URL(path, 'https://calisiyo.com.tr').pathname; } catch { return null; }
  if (TAB_ROUTES[pathname]) return TAB_ROUTES[pathname] as Href;
  const classroom = pathname.match(/^\/dashboard\/arkadaslar\/([0-9a-f-]{36})$/i);
  if (classroom) return `/sinif/${classroom[1]}` as Href;
  if (pathname.startsWith('/dashboard/')) return pathname.replace('/dashboard', '') as Href;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return pathname as Href;
  if (pathname.startsWith('/rehber')) return pathname as Href;
  return null;
}
