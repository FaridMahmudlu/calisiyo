import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

export type LiveTimerAction = { action: 'pause' | 'resume' | 'skipBreak'; at: number };

// What the Live Update shows: title ("Odak oturumu"), text ("Matematik · 25 dk"),
// next stage ("5 dk mola") and the stage-end alert copy.
export type LiveTimerPayload = {
  title: string; text: string; next: string; endsAt: number; remainingSeconds: number; totalSeconds: number;
  isBreak: boolean; alertTitle: string; alertBody: string; alert: boolean;
};

declare class LiveTimerModule extends NativeModule<{ onAction: (event: LiveTimerAction) => void }> {
  start(payload: LiveTimerPayload): Promise<void>;
  pause(payload: LiveTimerPayload): Promise<void>;
  stop(): Promise<void>;
  // Notification button taps handled natively while JS was not running.
  consumePendingActions(): LiveTimerAction[];
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): Promise<void>;
  liveUpdatesStatus(): 'on' | 'off' | 'unsupported';
  openLiveUpdateSettings(): Promise<void>;
}

// Null in Expo Go or on platforms without the native module.
export default requireOptionalNativeModule<LiveTimerModule>('LiveTimer');
