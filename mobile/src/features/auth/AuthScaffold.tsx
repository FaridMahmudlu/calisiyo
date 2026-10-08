import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { BrandLogo } from '@/components/brand/BrandMark';
import { ErrorState, IconButton, Screen, Text } from '@/components/ui';
import { space } from '@/theme/tokens';

export function AuthScaffold({ title, subtitle, error, children, back = true, footer }: {
  title: string; subtitle?: string; error?: string; children: ReactNode; back?: boolean; footer?: ReactNode;
}) {
  return (
    <Screen keyboard edges="top">
      <View style={styles.top}>
        {back && router.canGoBack() ? <IconButton icon={ChevronLeft} label="Geri" onPress={() => router.back()} /> : <View style={{ height: 40 }} />}
      </View>
      <View style={styles.brand}><BrandLogo size={34} /></View>
      <Text variant="title">{title}</Text>
      {subtitle ? <Text variant="body" color="textMuted" style={{ marginTop: space.xs }}>{subtitle}</Text> : null}
      {error ? <View style={{ marginTop: space.lg }}><ErrorState message={error} /></View> : null}
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { marginLeft: -space.sm, marginBottom: space.sm },
  brand: { marginBottom: space.xxl },
  body: { marginTop: space.xxl, gap: space.lg },
  footer: { marginTop: space.xxl, alignItems: 'center' },
});
