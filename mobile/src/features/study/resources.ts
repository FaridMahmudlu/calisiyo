import { supabase } from '@/lib/supabase';

export type Resource = {
  id: string;
  user_id: string;
  custom_ad?: string | null;
  kaynaklar_sistem?: { ad?: string | null; yayin?: string | null } | null;
  [key: string]: unknown;
};

export const resourceName = (resource?: Resource | null) => resource?.kaynaklar_sistem?.ad || resource?.custom_ad || '';

export async function fetchResourceOptions(userId?: string) {
  if (!userId) return [] as Resource[];
  const { data, error } = await supabase.from('kaynaklarim').select('*, kaynaklar_sistem(ad, yayin)').eq('user_id', userId);
  if (error) throw new Error('Kaynakların yüklenemedi.');
  return (data || []) as Resource[];
}
