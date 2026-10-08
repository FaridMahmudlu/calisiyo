import LiveTimer from '../../../modules/live-timer';
import type { TimerSurfaceState } from './surface';

export default {
  async start(state: TimerSurfaceState) {
    await LiveTimer?.start(state.title, state.subtitle, state.endsAt, state.mode === 'break');
  },
  async stop() {
    await LiveTimer?.stop();
  },
};
