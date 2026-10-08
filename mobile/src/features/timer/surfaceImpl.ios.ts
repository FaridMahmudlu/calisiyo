import FocusActivity from '@/widgets/FocusActivity';
import type { TimerSurfaceState } from './surface';

async function endAll() {
  for (const instance of FocusActivity.getInstances()) await instance.end('immediate').catch(() => undefined);
}

export default {
  async start(state: TimerSurfaceState) {
    await endAll();
    FocusActivity.start({
      title: state.title,
      subtitle: state.subtitle,
      mode: state.mode,
      startsAt: state.endsAt - state.totalSeconds * 1000,
      endsAt: state.endsAt,
    }, 'calisiyo://kronometre');
  },
  stop: endAll,
};
