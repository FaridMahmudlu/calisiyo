import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

export type BlockedUser = { userId: string; name: string; username?: string | null; blockedAt: string };
export type ReportTarget = { type: 'message' | 'user' | 'group'; id: string; label?: string };

const friendly = (error: { message?: string } | null, fallback: string) => error?.message?.replace(/^.*?:\s*/, '') || fallback;

export function useBlockedUsers(userId?: string | null) {
  return useQuery({
    queryKey: ['blocked-users', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_blocked_users');
      if (error) throw new Error('Engellenen kullanıcılar yüklenemedi.');
      return (data || []) as BlockedUser[];
    },
  });
}

// Confirms, blocks and refreshes the cached block list. Resolves to true on success.
export function useBlockActions(onError: (message: string) => void) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['blocked-users'] });

  const block = (person: { userId: string; name: string }) => new Promise<boolean>((resolve) => {
    Alert.alert(`${person.name} engellensin mi?`, 'Arkadaşlığınız kaldırılır, sana istek gönderemez ve sınıf mesajları senden gizlenir. Bunu Ayarlar’dan geri alabilirsin.', [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Engelle', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('block_user', { p_user_id: person.userId });
        if (error) { onError(friendly(error, 'Kullanıcı engellenemedi.')); resolve(false); return; }
        await refresh();
        resolve(true);
      } },
    ]);
  });

  const unblock = async (userId: string) => {
    const { error } = await supabase.rpc('unblock_user', { p_user_id: userId });
    if (error) { onError('Engel kaldırılamadı. Lütfen tekrar dene.'); return false; }
    await refresh();
    return true;
  };

  return { block, unblock };
}

export async function submitReport(target: ReportTarget, reason: string, details: string) {
  const { error } = await supabase.rpc('report_content', {
    p_target_type: target.type,
    p_target_id: target.id,
    p_reason: reason,
    p_details: details.trim() || null,
  });
  if (error) throw new Error(friendly(error, 'Şikayet gönderilemedi. Lütfen tekrar dene.'));
}
