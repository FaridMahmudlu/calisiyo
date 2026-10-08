import * as Application from 'expo-application';
import { Stack } from 'expo-router';
import { Ban, Bell, Check, Database, Download, Eye, FileText, Fingerprint, LockKeyhole, LogOut, Monitor, Moon, Save, Smartphone, Sun, Trash2, UserRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { PASSWORD_MIN_LENGTH, passwordValidationMessage } from '@shared/utils/password';
import { Button, Card, IconButton, ListItem, Screen, SectionHeader, Sheet, SwitchRow, Text, TextField, useToast } from '@/components/ui';
import { AlanPicker, YearPicker } from '@/features/auth/AlanPicker';
import { isDeviceRegisteredForPush, notificationPermission, registerDeviceForPush, unregisterDeviceForPush } from '@/features/notifications/push';
import { useBlockActions, useBlockedUsers } from '@/features/moderation/moderation';
import { useBiometric } from '@/features/security/BiometricGate';
import { api } from '@/lib/api';
import { LEGAL_LINKS, openWebPage } from '@/lib/browser';
import { shareTextFile } from '@/lib/share';
import { analyticsAvailable, setAnalyticsConsent, useAnalyticsConsent } from '@/lib/telemetry';
import { supabase } from '@/lib/supabase';
import type { StudyPreferences } from '@/lib/types';
import { useAccount } from '@/providers/AccountProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const DATA_TABLES = ['profiles', 'gunluk_gorevler', 'kaynaklarim', 'yapamadiklari', 'tekrarlar', 'denemeler', 'deneme_detaylari', 'calisma_suresi', 'notlar', 'konu_takibi', 'notifications'];
const DELETE_CONFIRMATION = 'HESABIMI SIL';
const THEMES: [ThemePreference, string, typeof Sun][] = [['light', 'Açık', Sun], ['dark', 'Koyu', Moon], ['system', 'Sistem', Monitor]];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const toast = useToast();
  const { user, profile, setProfile } = useAccount();
  const { signOut } = useAuth();
  const biometric = useBiometric();
  const analyticsConsent = useAnalyticsConsent();
  const [form, setForm] = useState({ fullName: profile?.full_name || '', alan: profile?.alan_secimi || 'sayisal', year: Number(profile?.yks_year || 2027) });
  const prefs = profile?.study_preferences || {};
  const [preferences, setPreferences] = useState<Required<Pick<StudyPreferences, 'notifications' | 'dailyPlan' | 'repeats' | 'pomodoro'>>>({
    notifications: profile?.notifications_enabled ?? prefs.notifications ?? true, dailyPlan: prefs.dailyPlan ?? true, repeats: prefs.repeats ?? true, pomodoro: prefs.pomodoro ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pushState, setPushState] = useState<'idle' | 'active' | 'saving'>(isDeviceRegisteredForPush() ? 'active' : 'idle');
  const [permission, setPermission] = useState('undetermined');
  const [password, setPassword] = useState({ value: '', confirm: '' });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const blocked = useBlockedUsers(user?.id);
  const { unblock } = useBlockActions(toast.error);

  useEffect(() => { notificationPermission().then(setPermission).catch(() => undefined); }, [pushState]);
  const patch = <T extends object>(setter: (value: T) => void, value: T) => { setter(value); setDirty(true); };

  const save = async () => {
    if (form.fullName.trim().length < 2) return toast.error('Ad soyad en az 2 karakter olmalıdır.');
    setSaving(true);
    try {
      const result = await api<{ profile: any }>('/api/account', {
        method: 'PATCH',
        body: { action: 'settings', fullName: form.fullName, field: form.alan, yksYear: form.year, notificationsEnabled: preferences.notifications, preferences: { ...preferences, theme: preference } },
      });
      setProfile(result.profile);
      setDirty(false);
      toast.success('Ayarların kaydedildi');
    } catch (error) { toast.error((error as Error).message); }
    finally { setSaving(false); }
  };

  const togglePush = async () => {
    if (pushState === 'active') { await unregisterDeviceForPush().catch(() => undefined); setPushState('idle'); toast.show('Bu cihazın bildirimleri kapatıldı.'); return; }
    setPushState('saving');
    const result = await registerDeviceForPush();
    setPushState(result.ok ? 'active' : 'idle');
    if (result.ok) toast.success('Bildirimler bu cihaza bağlandı.');
    else toast.error(result.reason);
  };

  const toggleNotifications = async (enabled: boolean) => {
    patch(setPreferences, { ...preferences, notifications: enabled });
    if (!enabled && pushState === 'active') { await unregisterDeviceForPush().catch(() => undefined); setPushState('idle'); }
  };

  const changePassword = async () => {
    const error = passwordValidationMessage(password.value);
    if (error) return toast.error(error);
    if (password.value !== password.confirm) return toast.error('Şifre doğrulaması eşleşmiyor.');
    const { error: updateError } = await supabase.auth.updateUser({ password: password.value });
    if (updateError) return toast.error('Şifren değiştirilemedi. Yeniden giriş yapıp tekrar dene.');
    setPassword({ value: '', confirm: '' });
    setPasswordOpen(false);
    toast.success('Şifren güncellendi');
  };

  const exportData = async (format: 'json' | 'csv') => {
    if (!profile) return;
    setExporting(true);
    const results = await Promise.all(DATA_TABLES.map(async (table) => {
      const request = table === 'deneme_detaylari' ? supabase.from(table).select('*') : supabase.from(table).select('*').eq(table === 'profiles' ? 'id' : 'user_id', profile.id);
      const { data, error } = await request;
      return [table, data || [], error] as const;
    }));
    setExporting(false);
    if (results.some(([, , error]) => error)) return toast.error('Verilerin hazırlanamadı. Lütfen tekrar dene.');
    const content = format === 'json'
      ? JSON.stringify({ exported_at: new Date().toISOString(), data: Object.fromEntries(results.map(([table, rows]) => [table, rows])) }, null, 2)
      : results.map(([table, rows]) => {
        if (!rows.length) return `# ${table}\n`;
        const columns = [...new Set(rows.flatMap((row: any) => Object.keys(row)))];
        const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        return `# ${table}\n${columns.map(escape).join(',')}\n${rows.map((row: any) => columns.map((column) => escape(typeof row[column] === 'object' ? JSON.stringify(row[column]) : row[column])).join(',')).join('\n')}`;
      }).join('\n\n');
    try { await shareTextFile(`calisiyo-verilerim-${new Date().toISOString().slice(0, 10)}.${format}`, content, format === 'json' ? 'application/json' : 'text/csv'); }
    catch (error) { toast.error((error as Error).message); }
  };

  const deleteAccount = async () => {
    if (deleteText.trim() !== DELETE_CONFIRMATION) return;
    setDeleting(true);
    try {
      await api('/api/account', { method: 'DELETE', body: { confirm: DELETE_CONFIRMATION } });
      setDeleteOpen(false);
      await signOut();
    } catch (error) { toast.error((error as Error).message); setDeleting(false); }
  };

  return (
    <Screen keyboard>
      <Stack.Screen options={{ headerRight: () => dirty ? <IconButton icon={saving ? Check : Save} label="Değişiklikleri kaydet" tone="primary" onPress={save} /> : null }} />

      <SectionHeader title="Profil" />
      <Card style={{ gap: space.md }}>
        <TextField label="Ad Soyad" icon={UserRound} value={form.fullName} onChangeText={(fullName) => patch(setForm, { ...form, fullName })} autoComplete="name" />
        <TextField label="E-posta" value={user?.email || ''} editable={false} />
      </Card>

      <SectionHeader title="YKS yılı ve alan" subtitle="Alan ve yıl değişikliği mevcut kayıtlarını silmez." />
      <View style={{ gap: space.md }}>
        <YearPicker value={form.year} onChange={(year) => patch(setForm, { ...form, year })} />
        <AlanPicker value={form.alan} onChange={(alan) => patch(setForm, { ...form, alan: alan as typeof form.alan })} />
        {form.year === 2028 ? <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://tymm.meb.gov.tr/ogretim-programlari/')}><Text variant="captionStrong" color="primary">Resmî MEB programını aç</Text></Pressable> : null}
      </View>

      <SectionHeader title="Görünüm" />
      <View style={styles.themes}>
        {THEMES.map(([value, label, Icon]) => {
          const active = preference === value;
          return (
            <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => { setPreference(value); setDirty(true); }}
              style={[styles.theme, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface }]}>
              <Icon size={20} color={active ? colors.primary : colors.textMuted} /><Text variant="captionStrong" color={active ? 'primaryPressed' : 'textMuted'}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Bildirimler" />
      <Card style={{ gap: 0 }}>
        <SwitchRow icon={Bell} title="Bildirim merkezi" description="Plan, çalışma, seri ve deneme gelişmelerini gösterir." value={preferences.notifications} onChange={toggleNotifications} />
        <SwitchRow title="Günlük plan hatırlatıcısı" description="Her gün planını hatırlatır." value={preferences.dailyPlan} disabled={!preferences.notifications} onChange={(dailyPlan) => patch(setPreferences, { ...preferences, dailyPlan })} />
        <SwitchRow title="Tekrar hatırlatıcıları" description="Tekrar zamanı geldiğinde bildirir." value={preferences.repeats} disabled={!preferences.notifications} onChange={(repeats) => patch(setPreferences, { ...preferences, repeats })} />
        <SwitchRow title="Kronometre bitiş bildirimi" description="Çalışma veya mola süresi bittiğinde bildirir." value={preferences.pomodoro} disabled={!preferences.notifications} onChange={(pomodoro) => patch(setPreferences, { ...preferences, pomodoro })} />
        {preferences.notifications ? (
          <View style={{ gap: space.sm, paddingTop: space.sm }}>
            <Button title={pushState === 'active' ? 'Bu cihazın bildirimlerini kapat' : pushState === 'saving' ? 'Cihaz bağlanıyor…' : 'Bu cihaza bildirim gönder'} icon={Smartphone} variant={pushState === 'active' ? 'secondary' : 'soft'} loading={pushState === 'saving'} onPress={togglePush} />
            {permission === 'denied' ? <Button title="Telefon ayarlarında izin ver" variant="ghost" size="sm" onPress={() => Linking.openSettings()} /> : null}
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Güvenlik" />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {biometric.available ? (
          <View style={{ paddingHorizontal: space.lg }}>
            <SwitchRow icon={Fingerprint} title={`${biometric.label} ile kilitle`} description="Uygulama 30 saniyeden uzun arka planda kalınca kilitlenir." value={biometric.enabled}
              onChange={async (value) => { const ok = await biometric.setEnabled(value); if (!ok) toast.error('Doğrulama tamamlanmadı.'); }} />
          </View>
        ) : null}
        <ListItem icon={LockKeyhole} title="Şifreyi değiştir" subtitle={`En az ${PASSWORD_MIN_LENGTH} karakter; büyük/küçük harf, rakam ve özel karakter`} onPress={() => setPasswordOpen(true)} />
        <ListItem icon={Ban} iconColor={colors.textMuted} title="Engellenen kullanıcılar" subtitle={blocked.data?.length ? `${blocked.data.length} kişi` : 'Engellediğin kimse yok'} onPress={() => setBlockedOpen(true)} />
      </Card>

      {analyticsAvailable ? (
        <Card style={{ marginTop: space.md }}>
          <SwitchRow icon={Eye} title="Anonim kullanım analitiği" description="Uygulamayı iyileştirmemize yardım eder. Reklam veya uygulamalar arası takip yapılmaz."
            value={analyticsConsent === 'accepted'} onChange={(value) => setAnalyticsConsent(value ? 'accepted' : 'rejected')} />
        </Card>
      ) : null}

      <SectionHeader title="Verilerim" subtitle="Tüm çalışma kayıtlarının taşınabilir kopyası" />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title="JSON paylaş" icon={Download} variant="secondary" loading={exporting} onPress={() => exportData('json')} style={{ flex: 1 }} />
        <Button title="CSV paylaş" icon={Database} variant="secondary" loading={exporting} onPress={() => exportData('csv')} style={{ flex: 1 }} />
      </View>

      <SectionHeader title="Yasal ve destek" />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {LEGAL_LINKS.map((link) => <ListItem key={link.path} icon={link.path === '/iletisim' ? Eye : FileText} iconColor={colors.textMuted} title={link.label} onPress={() => openWebPage(link.path)} />)}
      </Card>

      <SectionHeader title="Hesap" />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        <ListItem icon={LogOut} iconColor={colors.textMuted} title="Güvenli çıkış yap" chevron={false} onPress={signOut} />
        <ListItem icon={Trash2} title="Hesabımı kalıcı olarak sil" subtitle="Hesabın, çalışma kayıtların ve dosyaların silinir." danger onPress={() => { setDeleteText(''); setDeleteOpen(true); }} />
      </Card>
      <Text variant="caption" color="textSubtle" align="center" style={{ marginTop: space.xl }}>Calisiyo {Application.nativeApplicationVersion || '1.0.0'} ({Application.nativeBuildVersion || 'dev'})</Text>

      {dirty ? <Button title={saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'} icon={Save} size="lg" loading={saving} onPress={save} style={{ marginTop: space.lg }} /> : null}

      <Sheet open={blockedOpen} onClose={() => setBlockedOpen(false)} title="Engellenen kullanıcılar" subtitle="Engellediğin kişiler sana arkadaşlık isteği gönderemez ve sınıf mesajları senden gizlenir.">
        {(blocked.data || []).length === 0 ? <Text variant="body" color="textMuted">Engellediğin bir kullanıcı yok.</Text> : (blocked.data || []).map((person) => (
          <View key={person.userId} style={styles.blockedRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{person.name}</Text>
              <Text variant="caption" color="textMuted">{person.username ? `@${person.username} · ` : ''}{new Date(person.blockedAt).toLocaleDateString('tr-TR')}</Text>
            </View>
            <Button title="Engeli kaldır" size="sm" variant="secondary" onPress={async () => { if (await unblock(person.userId)) toast.success(`${person.name} engeli kaldırıldı.`); }} />
          </View>
        ))}
      </Sheet>

      <Sheet open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Şifreyi değiştir" footer={<Button title="Şifreyi değiştir" onPress={changePassword} style={{ flex: 1 }} />}>
        <TextField label="Yeni şifre" icon={LockKeyhole} secure value={password.value} onChangeText={(value) => setPassword({ ...password, value })} autoComplete="new-password" textContentType="newPassword" />
        <TextField label="Yeni şifre tekrar" icon={LockKeyhole} secure value={password.confirm} onChangeText={(confirm) => setPassword({ ...password, confirm })} autoComplete="new-password" textContentType="newPassword" />
      </Sheet>

      <Sheet open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Hesabını kalıcı olarak sil" subtitle="Bu işlem geri alınamaz."
        footer={<Button title={deleting ? 'Siliniyor…' : 'Hesabı sil'} variant="danger" loading={deleting} disabled={deleteText.trim() !== DELETE_CONFIRMATION} onPress={deleteAccount} style={{ flex: 1 }} />}>
        <Text variant="body" color="textMuted">Hesabın, çalışma kayıtların ve yüklediğin dosyalar kalıcı olarak silinir. Yasal saklama yükümlülüğü olan ödeme kayıtları kimliğinden ayrılarak saklanır.</Text>
        <TextField label={`Onaylamak için ${DELETE_CONFIRMATION} yaz`} value={deleteText} onChangeText={(value) => setDeleteText(value.toUpperCase().replaceAll('İ', 'I'))} autoCapitalize="characters" autoCorrect={false} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  themes: { flexDirection: 'row', gap: space.sm },
  theme: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: space.lg, borderRadius: radius.md, borderWidth: 1.5 },
  blockedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
