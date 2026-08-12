-- Cover foreign-key lookups used by joins, deletes and ownership checks.
create index if not exists calisma_suresi_ders_id_idx on public.calisma_suresi (ders_id);
create index if not exists calisma_suresi_owned_resource_idx on public.calisma_suresi (user_id, kaynak_id);
create index if not exists deneme_detaylari_ders_id_idx on public.deneme_detaylari (ders_id);
create index if not exists gunluk_gorevler_ders_id_idx on public.gunluk_gorevler (ders_id);
create index if not exists gunluk_gorevler_owned_resource_idx on public.gunluk_gorevler (user_id, kaynak_id);
create index if not exists kaynaklar_sistem_ders_id_idx on public.kaynaklar_sistem (ders_id);
create index if not exists kaynaklarim_custom_ders_id_idx on public.kaynaklarim (custom_ders_id);
create index if not exists kaynaklarim_kaynak_sistem_id_idx on public.kaynaklarim (kaynak_sistem_id);
create index if not exists konu_takibi_konu_id_idx on public.konu_takibi (konu_id);
create index if not exists konular_ders_id_idx on public.konular (ders_id);
create index if not exists notlar_user_id_idx on public.notlar (user_id);
create index if not exists pomodoro_kayitlari_ders_id_idx on public.pomodoro_kayitlari (ders_id);
create index if not exists tekrarlar_ders_id_idx on public.tekrarlar (ders_id);
create index if not exists tekrarlar_konu_id_idx on public.tekrarlar (konu_id);
create index if not exists yapamadiklari_ders_id_idx on public.yapamadiklari (ders_id);
create index if not exists yapamadiklari_owned_resource_idx on public.yapamadiklari (user_id, kaynak_id);
