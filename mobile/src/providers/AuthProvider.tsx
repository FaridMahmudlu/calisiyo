import type { Session } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { queryClient } from './QueryProvider';

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const signOutHandlers = new Set<() => Promise<void> | void>();

export function onBeforeSignOut(handler: () => Promise<void> | void) {
  signOutHandlers.add(handler);
  return () => { signOutHandlers.delete(handler); };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setInitializing(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    for (const handler of signOutHandlers) await Promise.resolve(handler()).catch(() => undefined);
    await supabase.auth.signOut({ scope: 'local' });
    queryClient.clear();
    await Storage.removeItem('calisiyo-query-cache').catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ session, initializing, signOut }), [initializing, session, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
