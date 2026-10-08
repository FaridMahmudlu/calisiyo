import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export function Screen({ children, onRefresh, scroll = true, padded = true, contentStyle, footer, keyboard = false, edges = 'auto' }: {
  children: ReactNode;
  onRefresh?: () => Promise<unknown> | void;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  keyboard?: boolean;
  edges?: 'auto' | 'top' | 'none';
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const topInset = edges === 'top' ? insets.top : 0;

  const refresh = onRefresh ? async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  } : undefined;

  const body = scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
      contentContainerStyle={[padded && styles.padded, { paddingTop: (padded ? space.lg : 0) + topInset, paddingBottom: insets.bottom + 128 }, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, { paddingTop: topInset }, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {keyboard ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}{footer}</KeyboardAvoidingView>
      ) : (<>{body}{footer}</>)}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: space.lg },
});
