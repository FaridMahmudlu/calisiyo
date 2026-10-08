import { UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Button, Text, TextField } from '@/components/ui';
import { AlanPicker, YearPicker } from '@/features/auth/AlanPicker';
import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useAuth } from '@/providers/AuthProvider';
import { space } from '@/theme/tokens';

export default function CompleteProfileScreen() {
  const { user, reload } = useAccount();
  const { signOut } = useAuth();
  const metadata = user?.user_metadata || {};
  const [form, setForm] = useState({
    fullName: String(metadata.full_name || metadata.name || ''),
    alanSecimi: String(metadata.alan_secimi || ''),
    yksYear: Number(metadata.yks_year || 2027),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (form.fullName.trim().length < 2) return setError('Ad soyad alanını doldurmalısın.');
    if (!form.alanSecimi) return setError('Devam etmek için bir alan seçmelisin.');
    setLoading(true);
    const profile = { full_name: form.fullName.trim(), alan_secimi: form.alanSecimi, yks_year: form.yksYear };
    const { error: profileError } = await supabase.rpc('upsert_own_profile', {
      p_full_name: profile.full_name,
      p_alan_secimi: profile.alan_secimi,
      p_yks_year: profile.yks_year,
    });
    if (profileError) {
      setLoading(false);
      return setError(profileError.message || 'Profil kaydedilemedi.');
    }
    await supabase.auth.updateUser({ data: profile });
    await supabase.auth.refreshSession();
    await reload();
    setLoading(false);
  };

  return (
    <AuthScaffold title="Profilini tamamla" subtitle="Sana doğru dersleri gösterebilmemiz için son iki bilgiyi seç." error={error} back={false}>
      <TextField label="Ad Soyad" icon={UserRound} value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} autoComplete="name" />
      <Text variant="label" color="textMuted">YKS yılı</Text>
      <YearPicker value={form.yksYear} onChange={(yksYear) => setForm({ ...form, yksYear })} />
      <Text variant="label" color="textMuted" style={{ marginTop: space.sm }}>Alan</Text>
      <AlanPicker value={form.alanSecimi} onChange={(alanSecimi) => setForm({ ...form, alanSecimi })} />
      <Button title={loading ? 'Hazırlanıyor…' : 'Çalışmaya Başla'} size="lg" loading={loading} onPress={submit} />
      <Button title="Farklı hesapla giriş yap" variant="ghost" onPress={signOut} />
    </AuthScaffold>
  );
}
