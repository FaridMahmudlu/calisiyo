import type { TimerSurfaceState } from './surface';

// Web and other platforms have no system timer surface.
export default {
  async start(_state: TimerSurfaceState) {},
  async stop() {},
};
