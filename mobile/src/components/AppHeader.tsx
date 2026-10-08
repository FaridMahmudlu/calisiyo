import type { NativeStackHeaderProps } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// JS-rendered stack header. The native Android toolbar mis-maps touches for
// custom header buttons (taps only land on part of the icon); rendering the
// header in React Native keeps every headerRight action fully tappable while
// screens keep using the regular `title` / `headerRight` options.
export function AppHeader({ options, route, navigation, back }: NativeStackHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const title = typeof options.headerTitle === 'string' ? options.headerTitle : options.title ?? route.name;
  const isModal = options.presentation === 'modal' || options.presentation === 'formSheet';
  const canGoBack = Boolean(back) || navigation.canGoBack();
  const right = options.headerRight?.({ tintColor: colors.primary, canGoBack });
  const large = Boolean(options.headerLargeTitle);

  return (
    <View style={[styles.wrap, { paddingTop: isModal ? space.sm : insets.top, backgroundColor: colors.background }]}>
      <View style={styles.row}>
        {canGoBack ? (
          <IconButton icon={isModal && !back ? X : ChevronLeft} label={isModal && !back ? 'Kapat' : 'Geri'} size={40} filled onPress={() => navigation.goBack()} />
        ) : <View style={styles.spacer} />}
        {!large ? <Text variant="heading" numberOfLines={1} style={styles.title}>{title}</Text> : <View style={{ flex: 1 }} />}
        <View style={styles.right}>{right}</View>
      </View>
      {large && title ? <Text variant="title" style={styles.largeTitle}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.sm },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  spacer: { width: 8 },
  title: { flex: 1, marginLeft: space.xs },
  right: { flexDirection: 'row', alignItems: 'center', minWidth: 44, justifyContent: 'flex-end' },
  largeTitle: { paddingHorizontal: space.sm, paddingBottom: space.sm },
});
