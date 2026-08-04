'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, Database, Download, Eye, LockKeyhole, Monitor, Moon, Save, Sun, UserRound } from 'lucide-react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { ALANLAR, getExamTabs } from '@/lib/constants/alanlar';
import PageHeader from '@/components/ui/PageHeader';

const DATA_TABLES = ['profiles', 'gunluk_gorevler', 'kaynaklarim', 'yapamadiklari', 'tekrarlar', 'denemeler', 'deneme_detaylari', 'calisma_suresi', 'notlar', 'konu_takibi', 'notifications'];

export default function AyarlarPage() {
  const { user, profile, setProfile, setError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({ full_name: '', alan_secimi: 'sayisal' });
  const [preferences, setPreferences] = useState({ theme: 'light', notifications: true, dailyPlan: true, repeats: true, pomodoro: true });
  const [browserPermission, setBrowserPermission] = useState('default');
  const [password, setPassword] = useState({ value: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  const hydrate = useCallback(() => {
    if (!profile) return;
    setForm({ full_name: profile.full_name || '', alan_secimi: profile.alan_secimi || 'sayisal' });
    const metadata = profile.study_preferences || user?.user_metadata?.study_preferences || {};
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('calisiyo-theme') : null;
    setPreferences({
      theme: storedTheme || metadata.theme || 'light',
      notifications: profile.notifications_enabled ?? metadata.notifications ?? true,
      dailyPlan: metadata.dailyPlan ?? true,
      repeats: metadata.repeats ?? true,
      pomodoro: metadata.pomodoro ?? true,
    });
  }, [profile, user]);

  useEffect(() => {
    const timer = setTimeout(hydrate, 0);
    return () => clearTimeout(timer);
  }, [hydrate]);

  useEffect(() => {
    const theme = preferences.theme;
    const resolved = theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme;
    document.documentElement.dataset.theme = resolved === 'dark' ? 'dark' : 'light';
  }, [preferences.theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBrowserPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const applyTheme = (theme) => {
    setPreferences((current) => ({ ...current, theme }));
    localStorage.setItem('calisiyo-theme', theme);
  };

  const requestBrowserPermission = async () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
    }
  };

  const toggleNotifications = async (enabled) => {
    setPreferences((current) => ({ ...current, notifications: enabled }));
    if (enabled) await requestBrowserPermission();
  };

  const permissionLabel = {
    granted: 'Tarayıcı bildirimi açık',
    denied: 'Tarayıcı izni engellendi',
    default: 'Tarayıcı izni bekliyor',
    unsupported: 'Bu tarayıcı masaüstü bildirimi desteklemiyor',
  }[browserPermission];

  const saveSettings = async () => {
    if (!profile?.id) return;
    if (form.full_name.trim().length < 2) {
      setError('Ad soyad en az 2 karakter olmalıdır.');
      return;
    }
    setSaving(true);
    setSaved(false);
    const response = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'settings',
        fullName: form.full_name,
        field: form.alan_secimi,
        preferences,
        notificationsEnabled: preferences.notifications,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok || !result.ok) {
      setError(result.message || 'Ayarların kaydedilemedi. Lütfen tekrar deneyin.');
      return;
    }
    setProfile(result.profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    if (password.value.length < 8) return setError('Yeni şifre en az 8 karakter olmalıdır.');
    if (password.value !== password.confirm) return setError('Şifre doğrulaması eşleşmiyor.');
    const response = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'password', password: password.value }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      return setError(result.message || 'Şifren değiştirilemedi. Lütfen tekrar deneyin.');
    }
    setPassword({ value: '', confirm: '' });
    setSaved(true);
  };

  const exportData = async (format) => {
    setExporting(true);
    const results = await Promise.all(DATA_TABLES.map(async (table) => {
      const query = table === 'deneme_detaylari'
        ? supabase.from(table).select('*')
        : supabase.from(table).select('*').eq(table === 'profiles' ? 'id' : 'user_id', profile.id);
      const { data, error } = await query;
      return [table, data || [], error];
    }));
    const failed = results.find(([, , queryError]) => queryError);
    setExporting(false);
    if (failed) return setError('Verilerin hazırlanamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
    const dataObject = Object.fromEntries(results.map(([table, rows]) => [table, rows]));
    let content;
    let mime;
    if (format === 'json') {
      content = JSON.stringify({ exported_at: new Date().toISOString(), data: dataObject }, null, 2);
      mime = 'application/json';
    } else {
      content = results.map(([table, rows]) => {
        if (!rows.length) return `# ${table}\n`;
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        return `# ${table}\n${columns.map(escape).join(',')}\n${rows.map((row) => columns.map((column) => escape(typeof row[column] === 'object' ? JSON.stringify(row[column]) : row[column])).join(',')).join('\n')}`;
      }).join('\n\n');
      mime = 'text/csv;charset=utf-8';
    }
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `calisiyo-verilerim-${new Date().toISOString().slice(0, 10)}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page settings-page">
      <PageHeader title="Ayarlar" description="Uygulama tercihlerini yönet ve hesabını güvenli şekilde kontrol et." actions={<><span className={`save-indicator ${saved ? 'is-visible' : ''}`}><Check size={15} /> Kaydedildi</span><button className="study-button study-button-primary" onClick={saveSettings} disabled={saving}><Save size={16} /> {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</button></>} />

      <section className="settings-section study-panel"><div className="settings-intro"><UserRound size={20} /><div><h2>Profil bilgileri</h2><p>Kişisel bilgilerini görüntüle ve güncelle.</p></div></div><div className="settings-fields"><label>Ad Soyad<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label><label>E-posta<input value={user?.email || ''} disabled /></label></div></section>

      <section className="settings-section study-panel"><div className="settings-intro"><Eye size={20} /><div><h2>Alan seçimi</h2><p>Alanına göre ders, konu ve analiz görünürlüğü özelleşir.</p></div></div><div className="field-options">{Object.entries(ALANLAR).map(([value, details]) => <button key={value} className={form.alan_secimi === value ? 'is-selected' : ''} onClick={() => setForm({ ...form, alan_secimi: value })}><span>{details.label}</span><small>{getExamTabs(value).join(' + ')}</small></button>)}</div><p className="settings-warning">Alan seçimini değiştirdiğinde konu görünürlüğü ve sınav sekmeleri güncellenir; mevcut kayıtların silinmez.</p></section>

      <section className="settings-section study-panel"><div className="settings-intro"><Monitor size={20} /><div><h2>Görünüm</h2><p>Uygulamanın görünüm temasını seç.</p></div></div><div className="theme-options">{[['light', 'Açık tema', Sun], ['dark', 'Koyu tema', Moon], ['system', 'Sistem ayarı', Monitor]].map(([value, label, Icon]) => <button key={value} className={preferences.theme === value ? 'is-selected' : ''} onClick={() => applyTheme(value)}><Icon size={18} />{label}</button>)}</div></section>

      <section className="settings-section study-panel"><div className="settings-intro"><Bell size={20} /><div><h2>Bildirimler</h2><p>Uygulama içi ve tarayıcı bildirimlerini tek yerden yönet.</p></div></div><div className="notification-settings-wrap"><div className="toggle-list notification-settings"><label className="notification-master"><span><strong>Bildirim merkezi</strong><small>Önemli plan, çalışma, seri ve deneme gelişmelerini gösterir.</small><em>{permissionLabel}</em></span><input type="checkbox" checked={preferences.notifications} onChange={(event) => toggleNotifications(event.target.checked)} /></label>{[['dailyPlan', 'Günlük plan hatırlatıcısı', 'Her gün planını hatırlatır.'], ['repeats', 'Tekrar hatırlatıcıları', 'Tekrar zamanı geldiğinde bildirir.'], ['pomodoro', 'Pomodoro bitiş bildirimi', 'Odak veya mola süresi bittiğinde bildirir.']].map(([key, label, text]) => <label key={key} className={!preferences.notifications ? 'is-disabled' : ''}><span><strong>{label}</strong><small>{text}</small></span><input type="checkbox" checked={preferences[key]} disabled={!preferences.notifications} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} /></label>)}</div>{preferences.notifications && browserPermission === 'default' && <button className="browser-notification-button" onClick={requestBrowserPermission}><Bell size={15} /> Tarayıcı bildirimlerini aç</button>}{preferences.notifications && browserPermission === 'denied' && <p className="browser-notification-help">Tarayıcı bildirimi engellenmiş. Adres çubuğundaki site izinlerinden bildirimleri açabilirsin.</p>}</div></section>

      <section className="settings-section study-panel"><div className="settings-intro"><LockKeyhole size={20} /><div><h2>Güvenlik</h2><p>Hesabının şifresini güncelle.</p></div></div><form className="settings-fields password-fields" onSubmit={updatePassword}><label>Yeni şifre<input type="password" minLength="8" value={password.value} onChange={(event) => setPassword({ ...password, value: event.target.value })} /></label><label>Yeni şifre tekrar<input type="password" minLength="8" value={password.confirm} onChange={(event) => setPassword({ ...password, confirm: event.target.value })} /></label><button className="study-button">Şifreyi değiştir</button></form></section>

      <section className="settings-section study-panel"><div className="settings-intro"><Database size={20} /><div><h2>Verilerim</h2><p>Tüm çalışma kayıtlarının taşınabilir kopyasını indir.</p></div></div><div className="export-actions"><button className="study-button" onClick={() => exportData('json')} disabled={exporting}><Download size={16} /> JSON olarak indir</button><button className="study-button" onClick={() => exportData('csv')} disabled={exporting}><Download size={16} /> CSV olarak indir</button></div></section>
    </div>
  );
}
