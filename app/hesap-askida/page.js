'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LifeBuoy, LogOut, ShieldAlert } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

export default function SuspendedAccountPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.replace('/giris');
    router.refresh();
  };

  return (
    <main className="suspended-account-page">
      <section>
        <BrandLogo priority />
        <span className="suspended-icon"><ShieldAlert size={30} /></span>
        <h1>Hesabın geçici olarak askıda</h1>
        <p>Çalışma verilerin korunuyor. Hesabın yeniden açıldığında kaldığın yerden devam edebilirsin.</p>
        <div className="suspended-actions">
          <a href="/iletisim"><LifeBuoy size={17} /> Destekle iletişime geç</a>
          <button onClick={logout} disabled={busy}><LogOut size={17} /> {busy ? 'Çıkış yapılıyor…' : 'Güvenli çıkış yap'}</button>
        </div>
      </section>
    </main>
  );
}
