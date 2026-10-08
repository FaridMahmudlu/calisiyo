import Storage from 'expo-sqlite/kv-store';

// Last known home-screen widget data. Android renders widgets in a headless
// JS task (app may be closed), so the snapshot is persisted locally.
export type WidgetSnapshot = {
  streak: number;
  todayMinutes: number;
  tasksDone: number;
  tasksTotal: number;
  nextTask: string;
  level: number;
  signedIn: boolean;
  updatedAt: number;
};

const KEY = 'calisiyo:widget-snapshot';
export const EMPTY_SNAPSHOT: WidgetSnapshot = { streak: 0, todayMinutes: 0, tasksDone: 0, tasksTotal: 0, nextTask: '', level: 1, signedIn: false, updatedAt: 0 };

export function readSnapshot(): WidgetSnapshot {
  try { return { ...EMPTY_SNAPSHOT, ...JSON.parse(Storage.getItemSync(KEY) || 'null') }; } catch { return EMPTY_SNAPSHOT; }
}

export function writeSnapshot(snapshot: WidgetSnapshot) {
  Storage.setItemSync(KEY, JSON.stringify(snapshot));
}
