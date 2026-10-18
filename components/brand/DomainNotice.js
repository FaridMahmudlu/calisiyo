'use client';

import { useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import { DOMAIN_NOTICE_STORAGE_KEY } from '@/lib/theme';

// Announces the calisiyo.com.tr → planliyo.com.tr move on the website only.
// Visibility is driven by a root attribute set before paint (see THEME_BOOT_SCRIPT),
// so the server-rendered markup never mismatches after hydration.
export default function DomainNotice({ variant = 'site' }) {
  useLayoutEffect(() => {
    try {
      if (window.localStorage.getItem(DOMAIN_NOTICE_STORAGE_KEY) === 'dismissed') document.documentElement.dataset.domainNotice = 'hidden';
    } catch { /* storage disabled */ }
  }, []);

  const dismiss = () => {
    try { window.localStorage.setItem(DOMAIN_NOTICE_STORAGE_KEY, 'dismissed'); } catch { /* storage disabled */ }
    document.documentElement.dataset.domainNotice = 'hidden';
  };

  return (
    <aside className={`domain-notice is-${variant}`} aria-label="Adres değişikliği duyurusu">
      <div className="domain-notice-inner">
        <span className="domain-notice-badge">Yeni adres</span>
        <p>
          <strong>Calisiyo artık Planliyo.</strong> calisiyo.com.tr adresimiz <b>planliyo.com.tr</b> olarak yenilendi.
          Hesabın ve verilerin aynen korunuyor; giriş, ödeme ve tüm işlemler artık yalnızca planliyo.com.tr üzerinden yapılır.
        </p>
        <button type="button" onClick={dismiss} aria-label="Duyuruyu kapat"><X size={17} /></button>
      </div>
    </aside>
  );
}
