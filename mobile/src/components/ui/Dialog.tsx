import * as Haptics from 'expo-haptics';
import { AlertTriangle, Info, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export type DialogButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => unknown };
type Tone = 'primary' | 'danger' | 'warning' | 'info';
type DialogOptions = { icon?: LucideIcon; tone?: Tone };
type DialogRequest = DialogOptions & { id: number; title: string; message?: string; buttons: DialogButton[] };

let present: ((request: DialogRequest) => void) | null = null;
let nextId = 1;

// Branded replacement for the system Alert. Same call shape as Alert.alert so
// screens keep their logic; falls back to Alert before the host is mounted.
export const Dialog = {
  alert(title: string, message?: string, buttons?: DialogButton[], options?: DialogOptions) {
    const list = buttons?.length ? buttons : [{ text: 'Tamam' }];
    if (!present) { Alert.alert(title, message, list); return; }
    present({ id: nextId++, title, message, buttons: list, ...options });
  },
  confirm({ title, message, confirmText = 'Onayla', cancelText = 'Vazgeç', destructive, icon, tone }: {
    title: string; message?: string; confirmText?: string; cancelText?: string; destructive?: boolean; icon?: LucideIcon; tone?: Tone;
  }) {
    return new Promise<boolean>((resolve) => Dialog.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { icon, tone }));
  },
};

const OPEN = { duration: 200, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 150, easing: Easing.in(Easing.cubic) };

export function DialogHost() {
  const { colors } = useTheme();
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const [closing, setClosing] = useState(false);
  const progress = useSharedValue(0);
  const current = queue[0];

  useEffect(() => {
    present = (request) => setQueue((items) => [...items, request]);
    return () => { present = null; };
  }, []);

  useEffect(() => {
    if (!current) return;
    const destructive = current.buttons.some((button) => button.style === 'destructive');
    Haptics.notificationAsync(destructive ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    progress.set(0);
    progress.set(withTiming(1, OPEN));
  }, [current, progress]);

  const finish = (button?: DialogButton) => {
    setClosing(false);
    setQueue((items) => items.slice(1));
    button?.onPress?.();
  };

  const choose = (button?: DialogButton) => {
    if (!current || closing) return;
    setClosing(true);
    progress.set(withTiming(0, CLOSE, (done) => { if (done) scheduleOnRN(finish, button); }));
  };

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const card = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.94 + progress.value * 0.06 }, { translateY: (1 - progress.value) * 12 }] }));

  if (!current) return null;

  const cancel = current.buttons.find((button) => button.style === 'cancel');
  const actions = current.buttons.filter((button) => button !== cancel);
  const destructive = actions.some((button) => button.style === 'destructive');
  const tone: Tone = current.tone || (destructive ? 'danger' : 'primary');
  const Icon = current.icon || (destructive ? AlertTriangle : Info);
  const tint = { primary: colors.primary, danger: colors.danger, warning: colors.warning, info: colors.info }[tone];
  const soft = { primary: colors.primarySoft, danger: colors.dangerSoft, warning: colors.warningSoft, info: colors.infoSoft }[tone];
  const dismiss = () => choose(cancel || (current.buttons.length === 1 ? current.buttons[0] : undefined));

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdrop]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>
        <Animated.View accessibilityRole="alert" accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }, card]}>
          <View style={[styles.icon, { backgroundColor: soft }]}><Icon size={26} color={tint} strokeWidth={2.2} /></View>
          <Text variant="heading" align="center" accessibilityRole="header">{current.title}</Text>
          {current.message ? <Text variant="body" color="textMuted" align="center">{current.message}</Text> : null}
          <View style={styles.actions}>
            {actions.map((button) => (
              <Button key={button.text} title={button.text} fullWidth variant={button.style === 'destructive' ? 'danger' : 'primary'} onPress={() => choose(button)} />
            ))}
            {cancel ? <Button title={cancel.text} fullWidth variant="secondary" onPress={() => choose(cancel)} /> : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: {
    width: '100%', maxWidth: 380, borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: space.xl, paddingTop: space.xxl, paddingBottom: space.xl,
    alignItems: 'center', gap: space.sm, shadowOpacity: 0.22, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 24,
  },
  icon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  actions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.md },
});
