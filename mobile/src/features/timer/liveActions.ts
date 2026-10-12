import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { explainPermission } from '@/lib/permissions';
import LiveTimer, { type LiveTimerAction } from '../../../modules/live-timer';
import { emitTimerChange, presetFor, readTimerState, writeTimerState, type TimerState } from './store';
import { syncTimerSurfaces } from './surface';

// Asks once (then every 3 days at most) for exact alarms so the stage-end alert is on time.
export async function ensureExactTimerAlarms() {
  if (Platform.OS !== 'android' || !LiveTimer || LiveTimer.canScheduleExactAlarms()) return;
  if (await explainPermission('exactAlarms')) await LiveTimer.openExactAlarmSettings().catch(() => undefined);
}

function apply(state: TimerState, { action, at }: LiveTimerAction): TimerState | null {
  if (action === 'pause' && state.running && state.deadline) {
    return { ...state, running: false, deadline: null, timeLeft: Math.max(0, Math.ceil((state.deadline - at) / 1000)) };
  }
  if (action === 'resume' && !state.running && state.timeLeft > 0) return { ...state, running: true, deadline: at + state.timeLeft * 1000 };
  if (action === 'skipBreak' && state.breakMode) {
    return { ...state, running: false, deadline: null, breakMode: false, timeLeft: presetFor(state).work * 60, sessionKey: '', studyDate: '' };
  }
  return null;
}

// Applies Live Update button taps (Android) to the stored Kronometre state —
// live while the app runs, or replayed from the native queue after a cold start.
export function useLiveTimerActions(userId: string | undefined, alert: boolean) {
  useEffect(() => {
    const module = LiveTimer;
    if (Platform.OS !== 'android' || !module || !userId) return undefined;
    const handle = (event: LiveTimerAction, handledNatively: boolean) => {
      const state = readTimerState(userId);
      const next = state && apply(state, event);
      if (!next) return;
      writeTimerState(userId, next);
      emitTimerChange();
      if (!handledNatively) syncTimerSurfaces(next, { alert, paused: event.action === 'pause' }).catch(() => undefined);
    };
    const drain = () => module.consumePendingActions().forEach((event) => handle(event, true));
    // Re-arm the running stage so a freshly granted exact-alarm permission takes effect.
    const rearm = () => {
      const state = readTimerState(userId);
      if (state?.running && state.deadline && state.deadline > Date.now()) syncTimerSurfaces(state, { alert }).catch(() => undefined);
    };
    drain();
    const subscription = module.addListener('onAction', (event) => handle(event, false));
    const appState = AppState.addEventListener('change', (status) => { if (status === 'active') { drain(); rearm(); } });
    return () => { subscription.remove(); appState.remove(); };
  }, [userId, alert]);
}
