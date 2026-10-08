import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export type Ders = { id: string; ad: string; renk: string | null; ikon: string | null; sinav_turu: string | null; sira: number; alan: string[]; curriculum_year: number };
export type Konu = { id: string; ders_id: string; ad: string; sira: number; [key: string]: unknown };

export async function fetchCourses(profile: Profile | null) {
  if (!profile) return [] as Ders[];
  const { data, error } = await supabase
    .from('dersler')
    .select('*')
    .eq('curriculum_year', Number(profile.yks_year || 2027))
    .contains('alan', [profile.alan_secimi || 'sayisal'])
    .order('sira');
  if (error) throw new Error('Derslerin yüklenemedi. Lütfen tekrar dene.');
  return (data || []) as Ders[];
}

export function throwIf(error: unknown, message: string) {
  if (error) throw new Error(message);
}

export const courseKey = (profile: Profile | null) => ['courses', profile?.yks_year, profile?.alan_secimi];
