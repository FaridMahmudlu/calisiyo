import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from './push';

// Device-local reminders (repeat time, Kronometre end). They work offline and
// without a server push token.
export async function scheduleLocalReminder({ id, title, body, date, route, channelId = 'default' }: {
  id: string; title: string; body: string; date: Date; route?: string; channelId?: string;
}) {
  if (date.getTime() <= Date.now() + 5_000) return null;
  if ((await requestNotificationPermission()) !== 'granted') return null;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  return Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: 'default', data: route ? { route } : {} },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId },
  });
}

export function cancelLocalReminder(id: string) {
  return Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
