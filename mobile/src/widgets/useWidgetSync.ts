import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { todayStr } from '@shared/utils/date';
import { onBeforeSignOut } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { EMPTY_SNAPSHOT, writeSnapshot, type WidgetSnapshot } from './snapshot';
import { publishWidget } from './publish';

async function push(snapshot: WidgetSnapshot) {
  writeSnapshot(snapshot);
  await publishWidget(snapshot).catch(() => undefined);
}

// Keeps iOS/Android home-screen widgets in sync with today's real data.
export function useWidgetSync(enabled: boolean) {
  const { user, stats } = useAccount();
  const userId = user?.id;
  const today = todayStr();
  const tasks = useQuery({
    queryKey: ['widget-tasks', userId, today],
    enabled: enabled && !!userId,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('gunluk_gorevler').select('konu,baslangic_saat,tamamlandi,dersler(ad)').eq('user_id', userId!).eq('tarih', today).order('baslangic_saat');
      if (error) throw error;
      return (data || []) as { konu?: string; baslangic_saat?: string; tamamlandi: boolean; dersler?: { ad?: string } | null }[];
    },
  });

  useEffect(() => onBeforeSignOut(() => push(EMPTY_SNAPSHOT)), []);

  useEffect(() => {
    if (!enabled || !userId || !tasks.data) return undefined;
    const next = tasks.data.find((task) => !task.tamamlandi);
    const snapshot: WidgetSnapshot = {
      streak: stats.streak, todayMinutes: stats.todayMinutes, level: stats.level, signedIn: true,
      tasksDone: tasks.data.filter((task) => task.tamamlandi).length, tasksTotal: tasks.data.length,
      nextTask: next ? [next.baslangic_saat?.slice(0, 5), next.dersler?.ad, next.konu].filter(Boolean).join(' · ') : '',
      updatedAt: Date.now(),
    };
    push(snapshot);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'background') push({ ...snapshot, updatedAt: Date.now() }); });
    return () => subscription.remove();
  }, [enabled, stats.level, stats.streak, stats.todayMinutes, tasks.data, userId]);

  return tasks.refetch;
}
