import LiveTimer from '../../../modules/live-timer';
import type { TimerSurfaceState } from './surface';

export default {
  async start(state: TimerSurfaceState) {
    await LiveTimer?.start(state.title, state.subtitle, state.endsAt, state.mode === 'break', state.totalSeconds, state.alertTitle, state.alertBody, state.alert);
  },
  async pause(state: TimerSurfaceState) {
    await LiveTimer?.pause(state.title, state.subtitle, state.remainingSeconds, state.mode === 'break', state.totalSeconds, state.alertTitle, state.alertBody, state.alert);
  },
  async stop() {
    await LiveTimer?.stop();
  },
};
