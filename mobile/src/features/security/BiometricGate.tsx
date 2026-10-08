import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Fingerprint, LockKeyhole } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const KEY = 'calisiyo-biometric-lock';
const RELOCK_AFTER_MS = 30_000;

type BiometricContextValue = {
  enabled: boolean;
  available: boolean;
  label: string;
  setEnabled: (enabled: boolean) => Promise<boolean>;
};

const BiometricContext = createContext<BiometricContextValue | null>(null);

async function describeHardware() {
  const [hasHardware, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  return { available: hasHardware && enrolled, label: face ? 'Yüz tanıma' : 'Parmak izi' };
}

export function BiometricGate({ active, children }: { active: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  const [enabled, setEnabledState] = useState(() => SecureStore.getItem(KEY) === '1');
  const [hardware, setHardware] = useState({ available: false, label: 'Biyometrik kilit' });
  const [locked, setLocked] = useState(() => active && SecureStore.getItem(KEY) === '1');
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);
  const initiallyLocked = useRef(locked);

  useEffect(() => { describeHardware().then(setHardware).catch(() => undefined); }, []);

  const unlock = useCallback(() => {
    if (prompting.current) return;
    prompting.current = true;
    LocalAuthentication.authenticateAsync({
      promptMessage: 'Calisiyo’yu aç',
      cancelLabel: 'Vazgeç',
      fallbackLabel: 'Cihaz şifresini kullan',
      disableDeviceFallback: false,
    }).catch(() => ({ success: false })).then((result) => {
      prompting.current = false;
      if (result.success) setLocked(false);
    });
  }, []);

  useEffect(() => {
    if (!active || !enabled) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundedAt.current = Date.now();
      if (state === 'active' && backgroundedAt.current && Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) {
        setLocked(true);
        backgroundedAt.current = null;
        unlock();
      }
    });
    return () => subscription.remove();
  }, [active, enabled, unlock]);

  // Initial cold-start lock prompts once; later locks prompt from the AppState listener.
  useEffect(() => { if (initiallyLocked.current) unlock(); }, [unlock]);

  const value = useMemo<BiometricContextValue>(() => ({
    enabled,
    available: hardware.available,
    label: hardware.label,
    setEnabled: async (next) => {
      if (next) {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Biyometrik kilidi aç', cancelLabel: 'Vazgeç' }).catch(() => ({ success: false }));
        if (!result.success) return false;
      }
      await SecureStore.setItemAsync(KEY, next ? '1' : '0');
      setLocked(false);
      setEnabledState(next);
      return true;
    },
  }), [enabled, hardware]);

  return (
    <BiometricContext.Provider value={value}>
      {children}
      {locked && active && enabled ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, styles.lock, { backgroundColor: colors.background }]}>
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><LockKeyhole size={30} color={colors.primary} /></View>
          <Text variant="title" align="center">Calisiyo kilitli</Text>
          <Text variant="body" color="textMuted" align="center">Devam etmek için {hardware.label.toLocaleLowerCase('tr-TR')} ile doğrula.</Text>
          <Button title="Kilidi aç" icon={Fingerprint} onPress={unlock} style={{ marginTop: space.lg, minWidth: 200 }} />
        </Animated.View>
      ) : null}
    </BiometricContext.Provider>
  );
}

export function useBiometric() {
  const context = useContext(BiometricContext);
  if (!context) throw new Error('useBiometric must be used within BiometricGate');
  return context;
}

const styles = StyleSheet.create({
  lock: { alignItems: 'center', justifyContent: 'center', padding: space.xxxl, gap: space.sm, zIndex: 2000 },
  icon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
});
