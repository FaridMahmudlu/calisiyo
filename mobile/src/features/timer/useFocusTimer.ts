import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { todayStr } from '@shared/utils/date';
import { cancelLocalReminder, scheduleLocalReminder } from '@/features/notifications/local';
import { requestNotificationPermission } from '@/features/notifications/push';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { defaultTimerState, presetFor, PRESETS, readTimerState, remainingSeconds, writeTimerState, type TimerState } from './store';
import { startTimerSurface, stopTimerSurface } from './surface';

const END_NOTIFICATION_ID = 'kronometre-stage-end';

export function useFocusTimer(profile: Profile | null, { onRecorded, onError }: { onRecorded: () => void; onError: (message: string) => void }) {
  const userId = profile?.id;
  const [state, setState] = useState<TimerState>(() => (userId && readTimerState(userId)) || defaultTimerState());
  const [now, setNow] = useState(() => Date.now());
  const finishing = useRef(false);
  const stateRef = useRef(state);

  const notificationsAllowed = profile?.notifications_enabled !== false && profile?.study_preferences?.pomodoro !== false;
  const preset = presetFor(state);
  const totalSeconds = (state.breakMode ? preset.breakMinutes : preset.work) * 60;
  const timeLeft = remainingSeconds(state, now);

  const update = useCallback((patch: Partial<TimerState>) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    if (userId) writeTimerState(userId, next);
    setState(next);
  }, [userId]);

  const syncSurfaces = useCallback(async (next: TimerState) => {
    if (!next.running || !next.deadline) {
      await cancelLocalReminder(END_NOTIFICATION_ID);
      await stopTimerSurface();
      return;
    }
    const p = presetFor(next);
    const title = next.breakMode ? 'Mola bitti' : 'Odak oturumu tamamlandı';
    const body = next.breakMode ? 'Hazırsan yeni odak oturumuna başlayabilirsin.' : `${p.work} dakikalık çalışma istatistiklerine kaydedilecek. Uygulamayı açarak molaya geç.`;
    if (notificationsAllowed) {
      await scheduleLocalReminder({ id: END_NOTIFICATION_ID, title, body, date: new Date(next.deadline), route: '/kronometre', channelId: 'timer' });
    }
    await startTimerSurface({
      endsAt: next.deadline,
      mode: next.breakMode ? 'break' : 'focus',
      title: next.breakMode ? 'Mola' : 'Odak oturumu',
      subtitle: next.breakMode ? `${p.breakMinutes} dk mola` : `${p.work} dk çalışma`,
      totalSeconds: (next.breakMode ? p.breakMinutes : p.work) * 60,
    });
  }, [notificationsAllowed]);

  const finishStage = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    const current = stateRef.current;
    const p = presetFor(current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (!current.breakMode) {
      if (userId && current.sessionKey) {
        const { error } = await supabase.rpc('complete_pomodoro_session', {
          p_session_key: current.sessionKey,
          p_work_minutes: p.work,
          p_break_minutes: p.breakMinutes,
          p_ders_id: current.courseId || null,
          p_kaynak_id: current.resourceId || null,
          p_study_date: current.studyDate || todayStr(),
        });
        if (error) onError(`Oturum istatistiklere kaydedilemedi: ${error.message}`);
        else onRecorded();
      }
      if (notificationsAllowed && userId) {
        await supabase.from('notifications').insert({
          user_id: userId, kind: 'reminder', title: 'Odak oturumu tamamlandı', body: `${p.work} dakikalık çalışma istatistiklerine kaydedildi.`,
          action_url: '/dashboard/pomodoro', dedupe_key: `pomodoro-${Crypto.randomUUID()}`,
        });
      }
      update({ running: false, deadline: null, breakMode: true, timeLeft: p.breakMinutes * 60 });
    } else {
      if (notificationsAllowed && userId) {
        await supabase.from('notifications').insert({
          user_id: userId, kind: 'reminder', title: 'Mola bitti', body: 'Hazırsan yeni odak oturumuna başlayabilirsin.',
          action_url: '/dashboard/pomodoro', dedupe_key: `pomodoro-${Crypto.randomUUID()}`,
        });
      }
      update({ running: false, deadline: null, breakMode: false, timeLeft: p.work * 60, sessionKey: '', studyDate: '' });
    }
    await stopTimerSurface();
    finishing.current = false;
  }, [notificationsAllowed, onError, onRecorded, update, userId]);

  useEffect(() => {
    if (!state.running) return undefined;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (remainingSeconds(stateRef.current, current) === 0) finishStage();
    };
    tick();
    const interval = setInterval(tick, 500);
    const subscription = AppState.addEventListener('change', (status) => status === 'active' && tick());
    return () => { clearInterval(interval); subscription.remove(); };
  }, [finishStage, state.running]);

  const toggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    const current = stateRef.current;
    if (current.running) {
      const next = { ...current, timeLeft: remainingSeconds(current), deadline: null, running: false };
      update(next);
      await syncSurfaces(next);
      return;
    }
    if (notificationsAllowed) await requestNotificationPermission().catch(() => undefined);
    const patch: Partial<TimerState> = { running: true, deadline: Date.now() + current.timeLeft * 1000 };
    if (!current.breakMode && !current.sessionKey) { patch.sessionKey = Crypto.randomUUID(); patch.studyDate = todayStr(); }
    const next = { ...current, ...patch };
    update(next);
    await syncSurfaces(next);
  };

  const resetTo = async (patch: Partial<TimerState>) => {
    const next = { ...stateRef.current, running: false, deadline: null, breakMode: false, sessionKey: '', studyDate: '', ...patch };
    update(next);
    await syncSurfaces(next);
  };

  return {
    state, preset, timeLeft, totalSeconds, elapsed: Math.max(0, totalSeconds - timeLeft),
    toggle,
    reset: () => resetTo({ timeLeft: presetFor(stateRef.current).work * 60 }),
    applyPreset: (index: number) => resetTo({ presetIndex: index, customActive: false, timeLeft: PRESETS[index].work * 60 }),
    applyCustom: (work: number, breakMinutes: number) => {
      const safeWork = Math.min(180, Math.max(1, Math.round(work) || 25));
      const safeBreak = Math.min(60, Math.max(1, Math.round(breakMinutes) || 5));
      return resetTo({ custom: { work: safeWork, breakMinutes: safeBreak }, customActive: true, timeLeft: safeWork * 60 });
    },
    setCourse: (courseId: string) => update({ courseId }),
    setResource: (resourceId: string) => update({ resourceId }),
    skipBreak: () => resetTo({ timeLeft: presetFor(stateRef.current).work * 60 }),
  };
}
