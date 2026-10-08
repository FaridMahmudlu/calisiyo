import { router } from 'expo-router';
import { CheckCircle2, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { PASSWORD_MIN_LENGTH, passwordValidationMessage } from '@shared/utils/password';
import { Button, ErrorState, Notice, Screen, Text, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    setError('');
    const passwordError = passwordValidationMessage(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirm) return setError('Şifreler birbiriyle eşleşmiyor.');
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError('Bağlantının süresi dolmuş olabilir. Yeni bir bağlantı iste.');
    setSaved(true);
  };

  return (
    <Screen keyboard contentStyle={{ gap: space.lg }}>
      <Text variant="body" color="textMuted">En az {PASSWORD_MIN_LENGTH} karakter; büyük/küçük harf, rakam ve özel karakter içeren yeni şifreni gir.</Text>
      {error ? <ErrorState message={error} /> : null}
      {saved ? (
        <>
          <Notice tone="success" icon={CheckCircle2}>Şifren güncellendi. Yeni şifrenle hesabına güvenle devam edebilirsin.</Notice>
          <Button title="Panele git" size="lg" onPress={() => router.replace('/')} />
        </>
      ) : (
        <>
          <TextField label="Yeni şifre" icon={Lock} secure value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" />
          <TextField label="Yeni şifreyi doğrula" icon={Lock} secure value={confirm} onChangeText={setConfirm} autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
          <Button title={loading ? 'Kaydediliyor…' : 'Şifreyi Güncelle'} size="lg" loading={loading} onPress={submit} />
        </>
      )}
    </Screen>
  );
}
