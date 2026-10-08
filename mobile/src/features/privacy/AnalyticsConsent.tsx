import { usePathname } from 'expo-router';
import { BarChart3, ShieldCheck } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Button, Sheet, Text } from '@/components/ui';
import { openWebPage } from '@/lib/browser';
import { analyticsAvailable, identifyUser, setAnalyticsConsent, trackScreen, useAnalyticsConsent } from '@/lib/telemetry';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// One-time choice, equivalent to the web cookie banner. Rejecting keeps the
// app fully functional; only product analytics stays off.
export function AnalyticsConsentGate() {
  const { colors } = useTheme();
  const consent = useAnalyticsConsent();
  const pathname = usePathname();
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  useEffect(() => { if (consent === 'accepted') trackScreen(pathname); }, [consent, pathname]);
  useEffect(() => { if (consent === 'accepted') identifyUser(userId); }, [consent, userId]);

  if (!analyticsAvailable) return null;
  return (
    <Sheet open={consent === 'unset'} onClose={() => setAnalyticsConsent('rejected')} title="Tercih senin"
      footer={(<>
        <Button title="Yalnızca zorunlu" icon={ShieldCheck} variant="secondary" onPress={() => setAnalyticsConsent('rejected')} style={{ flex: 1 }} />
        <Button title="İzin ver" icon={BarChart3} onPress={() => setAnalyticsConsent('accepted')} style={{ flex: 1 }} />
      </>)}>
      <View style={{ gap: space.sm }}>
        <Text variant="body" color="textMuted">Hesabının çalışması için gerekli veriler her zaman kullanılır. İzin verirsen, uygulamayı iyileştirmek için anonim kullanım analitiği toplarız. Reklam veya uygulamalar arası takip yapılmaz.</Text>
        <Text variant="captionStrong" color={colors.primary} onPress={() => openWebPage('/gizlilik')}>Gizlilik politikasını oku</Text>
        <Text variant="caption" color="textSubtle">Tercihini istediğin zaman Ayarlar’dan değiştirebilirsin.</Text>
      </View>
    </Sheet>
  );
}
