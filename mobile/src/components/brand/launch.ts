import { useSyncExternalStore } from 'react';

// The first real screen (sign-in or the loaded workspace) reports itself ready,
// so the launch animation ends exactly when there is something to show.
let ready = false;
const listeners = new Set<() => void>();

export function markLaunchReady() {
  if (ready) return;
  ready = true;
  listeners.forEach((listener) => listener());
}

export function useLaunchReady() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => ready,
  );
}
