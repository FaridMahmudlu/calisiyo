'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeRefresh({
  tables,
  userId,
  onChange,
  enabled = true,
  filterColumn = 'user_id',
}) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled || !userId || !tables?.length) return undefined;

    const supabase = createClient();
    let refreshTimer;
    let channel = supabase.channel(`study-data-${tables.join('-')}-${userId}`);
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => onChangeRef.current?.(), 140);
    };

    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `${filterColumn}=eq.${userId}`,
        },
        scheduleRefresh
      );
    });

    channel.subscribe();
    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [enabled, filterColumn, tables, userId]);
}
