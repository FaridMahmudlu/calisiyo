import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Mail, MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Notice, TextField } from '@/components/ui';
import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Geçerli bir e-posta adresi gir.');
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: Linking.createURL('/auth/callback', { queryParams: { next: 'sifre-yenile' } }),
    });
    setLoading(false);
    if (resetError) return setError(/rate limit/i.test(resetError.message) ? 'Çok fazla istek gönderildi. Birkaç dakika sonra tekrar dene.' : resetError.message);
    setSent(true);
  };

  return (
    <AuthScaffold
      title={sent ? 'E-postanı kontrol et' : 'Şifreni yenile'}
      subtitle={sent ? `${email} adresine güvenli şifre yenileme bağlantısı gönderdik.` : 'Hesabına bağlı e-posta adresini gir; sana güvenli bir yenileme bağlantısı gönderelim.'}
      error={error}
    >
      {sent ? (
        <View style={{ gap: 16 }}>
          <Notice tone="success" icon={MailCheck}>Bağlantıyı bu telefonda açtığında Calisiyo uygulaması açılır ve yeni şifreni belirleyebilirsin.</Notice>
          <Button title="Giriş sayfasına dön" variant="secondary" size="lg" onPress={() => router.replace('/giris')} />
        </View>
      ) : (
        <>
          <TextField label="E-posta" icon={Mail} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="send" onSubmitEditing={submit} />
          <Button title={loading ? 'Gönderiliyor…' : 'Bağlantıyı Gönder'} size="lg" loading={loading} onPress={submit} />
        </>
      )}
    </AuthScaffold>
  );
}
