import { X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { IconButton } from './Button';
import { Text } from './Text';

const OPEN = { duration: 260, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 200, easing: Easing.in(Easing.cubic) };

// Bottom sheet: eased slide (no spring overshoot), dimmed backdrop, drag the
// handle/header down to dismiss. Stays mounted until the close animation ends.
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
  const [visible, setVisible] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const height = useSharedValue(600);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setVisible(true);
  }

  useEffect(() => {
    if (open) {
      drag.set(0);
      progress.set(withTiming(1, OPEN));
    } else if (visible) {
      progress.set(withTiming(0, CLOSE, (finished) => {
        if (finished) scheduleOnRN(setVisible, false);
      }));
    }
  }, [open, visible, progress, drag]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((event) => { drag.set(Math.max(0, event.translationY)); })
    .onEnd((event) => {
      if (drag.get() > 110 || event.velocityY > 900) scheduleOnRN(onClose);
      else drag.set(withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) }));
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * interpolate(drag.value, [0, height.value], [1, 0.4], 'clamp') }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * (height.value + 40) + drag.value }] }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Kapat" style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
          <Animated.View
            onLayout={(event: LayoutChangeEvent) => { height.set(event.nativeEvent.layout.height); }}
            style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, space.lg), shadowColor: colors.shadow }, sheetStyle]}
          >
            <GestureDetector gesture={pan}>
              <View collapsable={false}>
                <View style={styles.grabberZone}><View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} /></View>
                {title ? (
                  <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading">{title}</Text>
                      {subtitle ? <Text variant="caption" color="textMuted">{subtitle}</Text> : null}
                    </View>
                    <IconButton icon={X} label="Kapat" onPress={onClose} />
                  </View>
                ) : null}
              </View>
            </GestureDetector>
            {scroll ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : <View style={styles.content}>{children}</View>}
            {footer ? <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 24,
  },
  grabberZone: { alignItems: 'center', paddingTop: space.sm, paddingBottom: space.sm },
  grabber: { width: 40, height: 5, borderRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingBottom: space.md, gap: space.sm },
  content: { paddingHorizontal: space.xl, paddingTop: space.xs, paddingBottom: space.lg, gap: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, flexDirection: 'row', gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
