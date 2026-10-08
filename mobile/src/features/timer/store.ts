import Storage from 'expo-sqlite/kv-store';
import { todayStr } from '@shared/utils/date';

// Same persisted shape as the web Kronometre (localStorage `calisiyo-pomodoro-v1:<userId>`).
export type TimerState = {
  presetIndex: number;
  custom: { work: number; breakMinutes: number };
  customActive: boolean;
  breakMode: boolean;
  timeLeft: number;
  deadline: number | null;
  sessionKey: string;
  studyDate: string;
  courseId: string;
  resourceId: string;
  running: boolean;
};

export const PRESETS = [
  { label: '25 / 5', work: 25, breakMinutes: 5 },
  { label: '50 / 10', work: 50, breakMinutes: 10 },
  { label: '90 / 20', work: 90, breakMinutes: 20 },
] as const;

export const timerKey = (userId: string) => `calisiyo-pomodoro-v1:${userId}`;

export const defaultTimerState = (): TimerState => ({
  presetIndex: 0,
  custom: { work: 25, breakMinutes: 5 },
  customActive: false,
  breakMode: false,
  timeLeft: PRESETS[0].work * 60,
  deadline: null,
  sessionKey: '',
  studyDate: '',
  courseId: '',
  resourceId: '',
  running: false,
});

export function readTimerState(userId: string): TimerState | null {
  try {
    const stored = JSON.parse(Storage.getItemSync(timerKey(userId)) || 'null');
    if (!stored || !Number.isInteger(stored.timeLeft) || stored.timeLeft < 0) return null;
    const presetIndex = Number.isInteger(stored.presetIndex) && PRESETS[stored.presetIndex] ? stored.presetIndex : 0;
    return {
      presetIndex,
      custom: {
        work: Math.min(180, Math.max(1, Number(stored.custom?.work) || 25)),
        breakMinutes: Math.min(60, Math.max(1, Number(stored.custom?.breakMinutes) || 5)),
      },
      customActive: Boolean(stored.customActive),
      breakMode: Boolean(stored.breakMode),
      timeLeft: stored.timeLeft,
      deadline: Number(stored.deadline) || null,
      sessionKey: String(stored.sessionKey || ''),
      studyDate: String(stored.studyDate || ''),
      courseId: String(stored.courseId || ''),
      resourceId: String(stored.resourceId || ''),
      running: Boolean(stored.running && stored.deadline),
    };
  } catch {
    Storage.removeItemSync(timerKey(userId));
    return null;
  }
}

export function writeTimerState(userId: string, state: TimerState) {
  Storage.setItemSync(timerKey(userId), JSON.stringify(state));
}

export function presetFor(state: TimerState) {
  return state.customActive ? state.custom : PRESETS[state.presetIndex] || PRESETS[0];
}

export function remainingSeconds(state: TimerState, now = Date.now()) {
  return state.running && state.deadline ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : Math.max(0, state.timeLeft);
}

// Minutes of an in-progress focus session today; feeds the live streak counter.
export function activeFocusMinutes(userId: string) {
  const state = readTimerState(userId);
  if (!state?.sessionKey || state.breakMode || state.studyDate !== todayStr()) return 0;
  const total = presetFor(state).work;
  return Math.min(total, Math.floor(Math.max(0, total * 60 - remainingSeconds(state)) / 60));
}
