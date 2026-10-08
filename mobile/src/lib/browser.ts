import * as WebBrowser from 'expo-web-browser';
import { webUrl } from './env';

// Legal documents are maintained once on the website and opened in an in-app browser.
export const LEGAL_LINKS = [
  { path: '/kullanim-sartlari', label: 'Kullanım Şartları' },
  { path: '/gizlilik', label: 'Gizlilik Politikası' },
  { path: '/kvkk', label: 'KVKK Aydınlatma Metni' },
  { path: '/cerez-politikasi', label: 'Çerez Politikası' },
  { path: '/iletisim', label: 'İletişim' },
] as const;

export function openWebPage(path: string) {
  return WebBrowser.openBrowserAsync(path.startsWith('http') ? path : webUrl(path), {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: '#00A870',
    toolbarColor: '#FFFFFF',
  });
}
