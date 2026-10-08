import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { todayStr } from '@shared/utils/date';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';

export type AppNotification = { id: string; kind: string; title: string; body: string; action_url: string | null; read_at: string | null; created_at: string };

const TABLES = ['notifications'];

export function useNotifications() {
  const { user } = useAccount();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const key = ['notifications', userId];

  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,kind,title,body,action_url,read_at,created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw new Error('Bildirimlerin şu anda yüklenemiyor.');
      return (data || []) as AppNotification[];
    },
  });

  // Same server-side reminder generation the web header triggers on load.
  useEffect(() => {
    if (!userId) return;
    api('/api/notifications/sync', { method: 'POST', body: { date: todayStr() } })
      .then(() => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }))
      .catch(() => undefined);
  }, [queryClient, userId]);

  const refetch = query.refetch;
  useRealtimeRefresh({ tables: TABLES, userId, onChange: refetch });

  const setRead = useCallback((ids: string[] | 'all') => {
    const readAt = new Date().toISOString();
    queryClient.setQueryData<AppNotification[]>(['notifications', userId], (items = []) => items.map((item) => (
      ids === 'all' || ids.includes(item.id) ? { ...item, read_at: item.read_at || readAt } : item
    )));
    let request = supabase.from('notifications').update({ read_at: readAt }).eq('user_id', userId!).is('read_at', null);
    if (ids !== 'all') request = request.in('id', ids);
    return request;
  }, [queryClient, userId]);

  const items = query.data || [];
  return { ...query, items, unread: items.filter((item) => !item.read_at).length, markRead: (id: string) => setRead([id]), markAllRead: () => setRead('all') };
}
