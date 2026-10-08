import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { activeFocusMinutes } from '@/features/timer/store';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { api, ApiError } from '@/lib/api';
import type { AccountPayload, AccountStats, CurrentPlan, Profile } from '@/lib/types';
import { useAuth } from './AuthProvider';

export const ACCOUNT_QUERY_KEY = ['account'] as const;
const FREE_PLAN: CurrentPlan = { code: 'baslangic', name: 'calisiyo ücretsiz', status: 'free', entitlements: {} };

type LiveStats = AccountStats & { streakQualified: boolean; activePomodoroMinutes: number };

type AccountContextValue = {
  status: 'loading' | 'ready' | 'suspended' | 'error';
  error: string;
  suspendedMessage: string;
  user: AccountPayload['user'] | null;
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  adminRole: string | null;
  currentPlan: CurrentPlan;
  contentProducer: AccountPayload['contentProducer'];
  stats: LiveStats;
  reload: () => Promise<unknown>;
};

const AccountContext = createContext<AccountContextValue | null>(null);
const ACCOUNT_TABLES = ['gunluk_gorevler', 'calisma_suresi', 'xp_events'];
const PROFILE_TABLES = ['profiles'];

export function AccountProvider({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const query = useQuery({
    queryKey: [...ACCOUNT_QUERY_KEY, userId],
    enabled: !!userId,
    queryFn: () => api<AccountPayload>('/api/account', { cache: 'no-store' }),
  });
  const [activeMinutes, setActiveMinutes] = useState(0);

  const apiError = query.error as ApiError | null;
  useEffect(() => {
    if (apiError?.status === 401) signOut();
  }, [apiError, signOut]);

  useEffect(() => {
    if (!userId) return undefined;
    const read = () => setActiveMinutes(activeFocusMinutes(userId));
    read();
    const timer = setInterval(read, 15000);
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && read());
    return () => { clearInterval(timer); subscription.remove(); };
  }, [userId]);

  const reload = useCallback(() => query.refetch(), [query]);
  useRealtimeRefresh({ tables: ACCOUNT_TABLES, userId, onChange: reload });
  useRealtimeRefresh({ tables: PROFILE_TABLES, userId, filterColumn: 'id', onChange: reload });

  const value = useMemo<AccountContextValue>(() => {
    const data = query.data;
    const progress = data?.progress;
    const base: AccountStats = {
      level: progress?.level || 1,
      xp: progress?.currentLevelXp ?? 0,
      totalXp: progress?.totalXp ?? 0,
      levelTitle: progress?.title || 'Yeni Başlangıç',
      progressPercent: progress?.progressPercent ?? 0,
      xpToNext: progress?.xpToNext ?? 250,
      streak: data?.liveStreak?.streak ?? 0,
      todayMinutes: data?.liveStreak?.todayMinutes ?? 0,
    };
    const liveToday = base.todayMinutes + activeMinutes;
    const liveStreak = base.todayMinutes < 30 && liveToday >= 30 ? base.streak + 1 : base.streak;
    const suspended = apiError?.status === 403 && apiError.code === 'account_suspended';
    return {
      status: data ? 'ready' : suspended ? 'suspended' : query.isError ? 'error' : 'loading',
      error: query.isError && !suspended ? (apiError?.message || 'Çalışma bilgilerin yüklenemedi.') : '',
      suspendedMessage: suspended ? apiError.message : '',
      user: data?.user || null,
      profile: data?.profile || null,
      setProfile: (profile) => queryClient.setQueryData([...ACCOUNT_QUERY_KEY, userId], (current: AccountPayload | undefined) => current ? { ...current, profile } : current),
      adminRole: data?.adminRole || null,
      currentPlan: data?.currentPlan || FREE_PLAN,
      contentProducer: data?.contentProducer || { active: false, status: 'not_enrolled' },
      stats: { ...base, streak: liveStreak, todayMinutes: liveToday, streakQualified: liveToday >= 30, activePomodoroMinutes: activeMinutes },
      reload,
    };
  }, [activeMinutes, apiError, query.data, query.isError, queryClient, reload, userId]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccount must be used within AccountProvider');
  return context;
}
