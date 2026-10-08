// Lock-screen / system surfaces for a running Kronometre session.
// iOS: Live Activity + Dynamic Island (expo-widgets, surfaceImpl.ios.ts).
// Android: ongoing countdown notification / Live Update (local module, surfaceImpl.android.ts).
import impl from './surfaceImpl';

export type TimerSurfaceState = { endsAt: number; mode: 'focus' | 'break'; title: string; subtitle: string; totalSeconds: number };

export async function startTimerSurface(state: TimerSurfaceState) {
  await impl.start(state).catch(() => undefined);
}

export async function stopTimerSurface() {
  await impl.stop().catch(() => undefined);
}
