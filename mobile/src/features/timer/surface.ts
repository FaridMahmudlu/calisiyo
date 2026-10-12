// Lock-screen / system surfaces for a running Kronometre session.
// iOS: Live Activity + Dynamic Island (expo-widgets, surfaceImpl.ios.ts).
// Android: ongoing countdown notification / Live Update with buttons and a
// native stage-end alert (local module, surfaceImpl.android.ts).
import { Platform } from 'react-native';
import { cancelLocalReminder, scheduleLocalReminder } from '@/features/notifications/local';
import { presetFor, type TimerState } from './store';
import impl from './surfaceImpl';

export type TimerSurfaceState = {
  endsAt: number; mode: 'focus' | 'break'; title: string; subtitle: string; next: string; totalSeconds: number;
  remainingSeconds: number; alertTitle: string; alertBody: string; alert: boolean;
};

const END_NOTIFICATION_ID = 'kronometre-stage-end';

export async function startTimerSurface(state: TimerSurfaceState) {
  await impl.start(state).catch(() => undefined);
}

export async function pauseTimerSurface(state: TimerSurfaceState) {
  await impl.pause(state).catch(() => undefined);
}

export async function stopTimerSurface() {
  await impl.stop().catch(() => undefined);
}

function describe(state: TimerState, alert: boolean): TimerSurfaceState {
  const p = presetFor(state);
  const totalSeconds = (state.breakMode ? p.breakMinutes : p.work) * 60;
  const course = state.breakMode ? '' : state.courseLabel || '';
  return {
    endsAt: state.deadline || 0,
    mode: state.breakMode ? 'break' : 'focus',
    title: state.breakMode ? 'Mola' : 'Odak oturumu',
    subtitle: state.breakMode ? `${p.breakMinutes} dk mola` : [course, `${p.work} dk odak`].filter(Boolean).join(' · '),
    next: state.breakMode ? `${p.work} dk odak` : `${p.breakMinutes} dk mola`,
    totalSeconds,
    remainingSeconds: Math.max(0, state.timeLeft),
    alertTitle: state.breakMode ? 'Mola bitti' : 'Odak oturumu bitti',
    alertBody: state.breakMode
      ? `Yeni ${p.work} dakikalık odak oturumuna hazırsan Kronometre’yi aç.`
      : `${p.work} dakika çalıştın${course ? ` (${course})` : ''}. Şimdi ${p.breakMinutes} dakika mola ver.`,
    alert,
  };
}

// Brings every system surface (live notification / Live Activity and the
// stage-end reminder) in line with the timer state.
export async function syncTimerSurfaces(state: TimerState, { alert, paused = false }: { alert: boolean; paused?: boolean }) {
  const surface = describe(state, alert);
  if (!state.running || !state.deadline) {
    await cancelLocalReminder(END_NOTIFICATION_ID);
    if (paused && state.timeLeft > 0 && state.timeLeft < surface.totalSeconds) await pauseTimerSurface(surface);
    else await stopTimerSurface();
    return;
  }
  // Android raises the end alert natively so notification buttons keep it accurate.
  if (alert && Platform.OS !== 'android') {
    await scheduleLocalReminder({ id: END_NOTIFICATION_ID, title: surface.alertTitle, body: surface.alertBody, date: new Date(state.deadline), route: '/kronometre', channelId: 'timer' });
  }
  await startTimerSurface(surface);
}
