// Dashboard colour theme. The preference lives in localStorage (and in the
// profile's study_preferences for new devices); public pages always stay light.
export const THEME_STORAGE_KEY = 'calisiyo-theme';
export const THEME_PREFERENCES = ['light', 'dark', 'system'];
const DARK_THEME_COLOR = '#0a1110';
const LIGHT_THEME_COLOR = '#00a870';

export function readThemePreference() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_PREFERENCES.includes(value) ? value : 'light';
  } catch {
    return 'light';
  }
}

export function resolveTheme(preference) {
  if (preference === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return preference === 'dark' ? 'dark' : 'light';
}

function setThemeColor(color) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

export function applyThemePreference(preference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  setThemeColor(theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  return theme;
}

export function saveThemePreference(preference) {
  try { window.localStorage.setItem(THEME_STORAGE_KEY, preference); } catch { /* storage disabled */ }
  return applyThemePreference(preference);
}

export function clearTheme() {
  delete document.documentElement.dataset.theme;
  setThemeColor(LIGHT_THEME_COLOR);
}

export const DOMAIN_NOTICE_STORAGE_KEY = 'planliyo-domain-notice';

// Runs while the HTML is parsed, before first paint: dashboard pages never flash
// light before switching to dark (theme is scoped to /dashboard), and a dismissed
// domain-change notice stays hidden without a hydration mismatch.
export const THEME_BOOT_SCRIPT = `(function(){try{var r=document.documentElement;if(localStorage.getItem('${DOMAIN_NOTICE_STORAGE_KEY}')==='dismissed')r.setAttribute('data-domain-notice','hidden');if(location.pathname.indexOf('/dashboard')!==0)return;var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);r.setAttribute('data-theme',d?'dark':'light');if(d){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','${DARK_THEME_COLOR}');}}catch(e){}})();`;
