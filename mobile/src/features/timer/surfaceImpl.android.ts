import LiveTimer, { type LiveTimerPayload } from '../../../modules/live-timer';
import type { TimerSurfaceState } from './surface';

const payload = (state: TimerSurfaceState): LiveTimerPayload => ({
  title: state.title,
  text: state.subtitle,
  next: state.next,
  endsAt: state.endsAt,
  remainingSeconds: state.remainingSeconds,
  totalSeconds: state.totalSeconds,
  isBreak: state.mode === 'break',
  alertTitle: state.alertTitle,
  alertBody: state.alertBody,
  alert: state.alert,
});

export default {
  async start(state: TimerSurfaceState) {
    await LiveTimer?.start(payload(state));
  },
  async pause(state: TimerSurfaceState) {
    await LiveTimer?.pause(payload(state));
  },
  async stop() {
    await LiveTimer?.stop();
  },
};
