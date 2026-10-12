import * as Linking from 'expo-linking';
import { router, Stack, type Href } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { LifeBuoy, LogOut, RefreshCw, ShieldAlert } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { BrandMark } from '@/components/brand/BrandMark';
import { markLaunchReady } from '@/components/brand/launch';
import { Button, Dialog, Spinner, Text } from '@/components/ui';
import { claimPendingCreatorCode } from '@/features/auth/creatorCode';
import { signOutGoogle } from '@/features/auth/social';
import { unregisterDeviceForPush } from '@/features/notifications/push';
import { useNotificationRouting } from '@/features/notifications/useNotificationRouting';
import { BiometricGate } from '@/features/security/BiometricGate';
import { useLiveTimerActions } from '@/features/timer/liveActions';
import { openWebPage } from '@/lib/browser';
import { AccountProvider, useAccount } from '@/providers/AccountProvider';
import { onBeforeSignOut, useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';
import { useWidgetSync } from '@/widgets/useWidgetSync';

function CenterState({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.center, { backgroundColor: colors.background }]}>{children}</View>;
}

let launchLinkReplayed = false;

// On a cold start (notification, widget, app shortcut) the navigator mounts only
// after the account loads, so the launch link is replayed once it exists.
function useLaunchLink(enabled: boolean) {
  useEffect(() => {
    if (!enabled || launchLinkReplayed) return;
    launchLinkReplayed = true;
    Linking.getInitialURL().then((url) => {
      if (!url?.startsWith('planliyo://')) return;
      const { hostname, path, queryParams } = Linking.parse(url);
      const route = [hostname, path].filter(Boolean).join('/');
      if (!route || route.startsWith('auth')) return;
      const query = new URLSearchParams(Object.entries(queryParams || {}).flatMap(([key, value]) => (value == null ? [] : [[key, String(value)]]))).toString();
      router.navigate(`/${route}${query ? `?${query}` : ''}` as Href);
    }).catch(() => undefined);
  }, [enabled]);
}

function AppNavigator() {
  const account = useAccount();
  const { signOut } = useAuth();
  const { colors } = useTheme();
  const ready = account.status === 'ready';
  const timerAlerts = account.profile?.notifications_enabled !== false && account.profile?.study_preferences?.pomodoro !== false;
  useNotificationRouting(ready);
  useWidgetSync(ready);
  useLiveTimerActions(ready ? account.profile?.id : undefined, timerAlerts);
  useLaunchLink(ready && !!account.user?.user_metadata?.alan_secimi);
  useEffect(() => { if (account.status !== 'loading') markLaunchReady(); }, [account.status]);

  useEffect(() => onBeforeSignOut(async () => {
    await unregisterDeviceForPush().catch(() => undefined);
    await signOutGoogle();
  }), []);

  useEffect(() => {
    if (!ready) return;
    claimPendingCreatorCode().then((ok) => {
      if (!ok) Dialog.alert('Kod ilişkilendirilemedi', 'Hesabın oluşturuldu ancak içerik üretici kodun hesabına güvenli biçimde ilişkilendirilemedi. Tam fiyatlı ödeme başlatılmadı. Yardım için destek@planliyo.com.tr adresine yazabilirsin.');
    });
  }, [ready]);

  if (account.status === 'loading') {
    return (
      <CenterState>
        <BrandMark size={64} />
        <Spinner color={colors.primary} style={{ marginTop: space.xl }} />
        <Text variant="caption" color="textMuted">Çalışma alanın hazırlanıyor…</Text>
      </CenterState>
    );
  }

  if (account.status === 'suspended') {
    return (
      <CenterState>
        <View style={[styles.icon, { backgroundColor: colors.warningSoft }]}><ShieldAlert size={30} color={colors.warning} /></View>
        <Text variant="title" align="center">Hesabın geçici olarak askıda</Text>
        <Text variant="body" color="textMuted" align="center">{account.suspendedMessage || 'Çalışma verilerin korunuyor. Hesabın yeniden açıldığında kaldığın yerden devam edebilirsin.'}</Text>
        <Button title="Destekle iletişime geç" icon={LifeBuoy} variant="secondary" onPress={() => openWebPage('/iletisim')} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
        <Button title="Güvenli çıkış yap" icon={LogOut} variant="danger" onPress={signOut} style={{ alignSelf: 'stretch' }} />
      </CenterState>
    );
  }

  if (account.status === 'error') {
    return (
      <CenterState>
        <Text variant="heading" align="center">Çalışma bilgilerin yüklenemedi</Text>
        <Text variant="body" color="textMuted" align="center">{account.error}</Text>
        <Button title="Tekrar dene" icon={RefreshCw} onPress={account.reload} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
        <Button title="Çıkış yap" icon={LogOut} variant="ghost" onPress={signOut} style={{ alignSelf: 'stretch' }} />
      </CenterState>
    );
  }

  const needsProfile = !account.user?.user_metadata?.alan_secimi;

  return (
    <BiometricGate active={!needsProfile}>
      <Stack
        screenOptions={{
          header: (props) => <AppHeader {...props} />,
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: fonts.bold, color: colors.text },
          headerLargeTitleStyle: { fontFamily: fonts.heavy, color: colors.text },
          headerLargeTitleShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Protected guard={needsProfile}>
          <Stack.Screen name="profilini-tamamla" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!needsProfile}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="haftalik-program" options={{ title: 'Haftalık Program' }} />
          <Stack.Screen name="konu-takibi" options={{ title: 'Konu Takibi' }} />
          <Stack.Screen name="deneme-analizi" options={{ title: 'Deneme Analizi' }} />
          <Stack.Screen name="tekrarlarim" options={{ title: 'Tekrarlarım' }} />
          <Stack.Screen name="yapamadiklari" options={{ title: 'Yapamadığım Sorular' }} />
          <Stack.Screen name="kaynaklarim" options={{ title: 'Kaynaklarım' }} />
          <Stack.Screen name="istatistikler" options={{ title: 'İstatistikler' }} />
          <Stack.Screen name="not-defteri" options={{ title: 'Not Defterim' }} />
          <Stack.Screen name="hedeflerim" options={{ title: 'Hedeflerim' }} />
          <Stack.Screen name="gelisim" options={{ title: 'Gelişim ve Seviyem' }} />
          <Stack.Screen name="bildirimler" options={{ title: 'Bildirimler' }} />
          <Stack.Screen name="abonelik" options={{ title: 'Paketim' }} />
          <Stack.Screen name="ayarlar" options={{ title: 'Ayarlar' }} />
          <Stack.Screen name="icerik-ureticisi" options={{ title: 'İçerik Üretici Programı' }} />
          <Stack.Screen name="sifre-yenile" options={{ title: 'Yeni şifre', presentation: 'modal' }} />
          <Stack.Screen name="sinif/[groupId]" options={{ title: 'Çalışma Sınıfı' }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </BiometricGate>
  );
}

export default function AppLayout() {
  return (
    <AccountProvider>
      <AppNavigator />
    </AccountProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.sm },
  icon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
});
