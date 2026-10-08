import { Link, router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { SocialButtons } from '@/features/auth/SocialButtons';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

export default function LoginScreen() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!form.email.trim() || !form.password) return setError('E-posta ve şifreni girmelisin.');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setLoading(false);
    if (signInError) {
      setError(/confirm/i.test(signInError.message)
        ? 'E-posta adresini henüz doğrulamadın. Gelen kutundaki bağlantıya dokun.'
        : 'E-posta veya şifre hatalı. Bilgilerini kontrol edip tekrar dene.');
    }
  };

  return (
    <AuthScaffold
      title="Tekrar hoş geldin"
      subtitle="Hesabına giriş yaparak kaldığın yerden devam et."
      error={error}
      footer={(
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text variant="body" color="textMuted">Hesabın yok mu?</Text>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/kayit')}><Text variant="bodyStrong" color="primary">Ücretsiz hesap oluştur</Text></Pressable>
        </View>
      )}
    >
      <SocialButtons onError={setError} />
      <TextField label="E-posta" icon={Mail} value={form.email} onChangeText={(email) => setForm({ ...form, email })} placeholder="ornek@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
      <View style={{ gap: space.sm }}>
        <TextField label="Şifre" icon={Lock} secure value={form.password} onChangeText={(password) => setForm({ ...form, password })} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
        <Link href="/sifremi-unuttum" asChild>
          <Pressable accessibilityRole="link" style={{ alignSelf: 'flex-end' }} hitSlop={8}><Text variant="captionStrong" color="primary">Şifremi unuttum</Text></Pressable>
        </Link>
      </View>
      <Button title={loading ? 'Giriş yapılıyor…' : 'Giriş Yap'} size="lg" loading={loading} onPress={submit} />
    </AuthScaffold>
  );
}
