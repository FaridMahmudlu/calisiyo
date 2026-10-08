import { Redirect, Stack } from 'expo-router';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

export default function AdminLayout() {
  const { colors } = useTheme();
  const { adminRole } = useAccount();
  if (!adminRole) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{
      headerShadowVisible: false,
      headerTintColor: colors.primary,
      headerTitleStyle: { fontFamily: fonts.bold, color: colors.text },
      headerStyle: { backgroundColor: colors.background },
      contentStyle: { backgroundColor: colors.background },
      headerBackButtonDisplayMode: 'minimal',
    }}>
      <Stack.Screen name="index" options={{ title: 'Yönetim Merkezi' }} />
      <Stack.Screen name="odemeler" options={{ title: 'Ödeme İnceleme' }} />
      <Stack.Screen name="icerik-ureticileri" options={{ title: 'İçerik Üreticileri' }} />
    </Stack>
  );
}
