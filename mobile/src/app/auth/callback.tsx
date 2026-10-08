import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// Handles calisiyo://auth/callback links from confirmation and password-reset
// emails that were requested in the app (PKCE verifier lives on this device).
export default function AuthCallbackScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ code?: string; next?: string; error_description?: string }>();
  const [exchangeError, setExchangeError] = useState('');
  const handled = useRef(false);
  const error = params.error_description ? String(params.error_description) : !params.code ? 'Bağlantı geçersiz veya süresi dolmuş.' : exchangeError;

  useEffect(() => {
    if (handled.current || !params.code || params.error_description) return;
    handled.current = true;
    supabase.auth.exchangeCodeForSession(String(params.code)).then(({ error: failed }) => {
      if (failed) {
        setExchangeError('Bağlantının süresi dolmuş olabilir veya başka bir cihazda istenmiş. Lütfen yeni bir bağlantı iste.');
        return;
      }
      router.replace(params.next === 'sifre-yenile' ? '/sifre-yenile' : '/');
    });
  }, [params.code, params.error_description, params.next]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.lg, backgroundColor: colors.background }}>
      {error ? (
        <>
          <Text variant="heading" align="center">Bağlantı açılamadı</Text>
          <Text variant="body" color="textMuted" align="center">{error}</Text>
          <Button title="Devam et" onPress={() => router.replace('/')} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text variant="body" color="textMuted">Hesabın doğrulanıyor…</Text>
        </>
      )}
    </View>
  );
}
