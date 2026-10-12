import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

export type LiveTimerAction = { action: 'pause' | 'resume' | 'skipBreak'; at: number };

declare class LiveTimerModule extends NativeModule<{ onAction: (event: LiveTimerAction) => void }> {
  start(title: string, text: string, endsAt: number, isBreak: boolean, totalSeconds: number, alertTitle: string, alertBody: string, alert: boolean): Promise<void>;
  pause(title: string, text: string, remainingSeconds: number, isBreak: boolean, totalSeconds: number, alertTitle: string, alertBody: string, alert: boolean): Promise<void>;
  stop(): Promise<void>;
  // Notification button taps handled natively while JS was not running.
  consumePendingActions(): LiveTimerAction[];
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): Promise<void>;
}

// Null in Expo Go or on platforms without the native module.
export default requireOptionalNativeModule<LiveTimerModule>('LiveTimer');
