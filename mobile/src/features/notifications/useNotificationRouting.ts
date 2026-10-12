import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { appRouteFromWebPath } from '@/lib/routes';
import { markNotificationRead } from './useNotifications';

export function useNotificationRouting(enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return undefined;
    const open = (notification: Notifications.Notification) => {
      const data = notification.request.content.data || {};
      if (typeof data.notificationId === 'string') {
        markNotificationRead(data.notificationId)
          .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
          .catch(() => undefined);
      }
      const route = typeof data.route === 'string' ? data.route : appRouteFromWebPath(data.url as string);
      if (route) router.push(route as never);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) open(last.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => open(response.notification));
    return () => subscription.remove();
  }, [enabled, queryClient]);
}
