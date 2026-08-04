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
    let channel = supabase.channel(`study-data-${tables.join('-')}-${userId}`);

    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `${filterColumn}=eq.${userId}`,
        },
        () => onChangeRef.current?.()
      );
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, filterColumn, tables, userId]);
}
