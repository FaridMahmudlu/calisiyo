import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { markLaunchReady } from '@/components/brand/launch';
import { useTheme } from '@/theme/ThemeProvider';

export default function AuthLayout() {
  const { colors } = useTheme();
  useEffect(markLaunchReady, []);
  return (
    <Stack initialRouteName="welcome" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
    </Stack>
  );
}
