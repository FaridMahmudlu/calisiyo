import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

let channelSequence = 0;

export function useRealtimeRefresh({ tables, userId, onChange, enabled = true, filterColumn = 'user_id' }: {
  tables: string[];
  userId?: string | null;
  onChange: () => void;
  enabled?: boolean;
  filterColumn?: string;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const tableKey = tables.join(',');

  useEffect(() => {
    if (!enabled || !userId || !tableKey) return undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    channelSequence += 1;
    let channel = supabase.channel(`study-data-${tableKey}-${userId}-${channelSequence}`);
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => onChangeRef.current?.(), 140);
    };
    tableKey.split(',').forEach((table) => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `${filterColumn}=eq.${userId}` }, scheduleRefresh);
    });
    channel.subscribe();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [enabled, filterColumn, tableKey, userId]);
}
