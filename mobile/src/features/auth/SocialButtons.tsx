import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { appleSignInAvailable, googleSignInAvailable, signInWithApple, signInWithGoogle, SocialCancelled } from './social';

function GoogleGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

export function SocialButtons({ onError, beforeSignIn, afterSignIn }: {
  onError: (message: string) => void;
  beforeSignIn?: () => Promise<boolean>;
  afterSignIn?: () => Promise<void>;
}) {
  const { colors, scheme } = useTheme();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [apple, setApple] = useState(false);

  useEffect(() => { appleSignInAvailable().then((value) => setApple(!!value)).catch(() => setApple(false)); }, []);

  const run = async (provider: 'google' | 'apple') => {
    onError('');
    if (beforeSignIn && !(await beforeSignIn())) return;
    setBusy(provider);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
      await afterSignIn?.();
    } catch (error: any) {
      if (!(error instanceof SocialCancelled)) {
        onError(/provider|enabled|unsupported/i.test(String(error?.message))
          ? `${provider === 'google' ? 'Google' : 'Apple'} ile giriş şu anda kullanılamıyor. E-posta ile devam edebilirsin.`
          : 'Giriş tamamlanamadı. Lütfen tekrar dene.');
      }
    } finally {
      setBusy(null);
    }
  };

  if (!googleSignInAvailable && !apple) return null;

  return (
    <View style={{ gap: space.sm }}>
      {apple && Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.sm}
          style={{ height: 50 }}
          onPress={() => run('apple')}
        />
      ) : null}
      {googleSignInAvailable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Google ile devam et"
          disabled={!!busy}
          onPress={() => run('google')}
          style={({ pressed }) => [styles.google, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : colors.surface, opacity: busy ? 0.6 : 1 }]}
        >
          <GoogleGlyph />
          <Text variant="subheading">{busy === 'google' ? 'Google’a bağlanılıyor…' : 'Google ile devam et'}</Text>
        </Pressable>
      ) : null}
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text variant="caption" color="textSubtle">veya e-posta ile</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  google: { height: 50, borderRadius: radius.sm, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
});
