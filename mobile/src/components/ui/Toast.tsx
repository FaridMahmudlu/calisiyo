import * as Haptics from 'expo-haptics';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Text } from './Text';

type Tone = 'success' | 'error' | 'info';
type ToastState = { id: number; message: string; tone: Tone } | null;
type ToastApi = { show: (message: string, tone?: Tone) => void; success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: Tone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    Haptics.notificationAsync(tone === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 4200 : 2600);
  }, []);

  const api = useMemo<ToastApi>(() => ({ show, success: (m) => show(m, 'success'), error: (m) => show(m, 'error') }), [show]);
  const Icon = toast?.tone === 'error' ? AlertCircle : toast?.tone === 'success' ? CheckCircle2 : Info;
  const tint = toast?.tone === 'error' ? colors.danger : toast?.tone === 'success' ? colors.primary : colors.info;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View key={toast.id} entering={FadeInUp.springify()} exiting={FadeOutUp} pointerEvents="box-none" style={[styles.wrap, { top: insets.top + space.sm }]}>
          <Pressable accessibilityRole="alert" onPress={() => setToast(null)} style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <Icon size={20} color={tint} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>{toast.message}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 1000 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1, shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
});
