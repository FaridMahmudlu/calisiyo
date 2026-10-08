import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { IconButton } from './Button';
import { Text } from './Text';

export function Sheet({ open, onClose, title, subtitle, children, footer, scroll = true }: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {open ? (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}>
            <Pressable accessibilityLabel="Kapat" style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(220)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, space.lg) }]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
            {title ? (
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text variant="heading">{title}</Text>
                  {subtitle ? <Text variant="caption" color="textMuted">{subtitle}</Text> : null}
                </View>
                <IconButton icon={X} label="Kapat" onPress={onClose} />
              </View>
            ) : null}
            {scroll ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : <View style={styles.content}>{children}</View>}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: space.sm },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingBottom: space.sm, gap: space.sm },
  content: { paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, flexDirection: 'row', gap: space.sm },
});
