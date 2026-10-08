import { requireOptionalNativeModule } from 'expo-modules-core';

type LiveTimerModule = {
  start(title: string, text: string, endsAt: number, isBreak: boolean): Promise<void>;
  stop(): Promise<void>;
};

// Null in Expo Go or on platforms without the native module.
export default requireOptionalNativeModule<LiveTimerModule>('LiveTimer');
