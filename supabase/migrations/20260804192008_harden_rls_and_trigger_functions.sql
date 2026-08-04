-- Trigger functions are invoked by database triggers and must not be exposed as RPCs.
revoke all on function public.create_topic_repeats() from public, anon, authenticated;

-- Scope existing ownership policies to signed-in users and cache auth.uid() once per query.
drop policy if exists "Users own konu_takibi" on public.konu_takibi;
create policy "Users own konu_takibi" on public.konu_takibi for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users own kaynaklarim" on public.kaynaklarim;
create policy "Users own kaynaklarim" on public.kaynaklarim for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users own gunluk_gorevler" on public.gunluk_gorevler;
create policy "Users own gunluk_gorevler" on public.gunluk_gorevler for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users own denemeler" on public.denemeler;
create policy "Users own denemeler" on public.denemeler for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users own deneme_detaylari" on public.deneme_detaylari;
create policy "Users own deneme_detaylari" on public.deneme_detaylari for all to authenticated
using (exists (
  select 1 from public.denemeler
  where denemeler.id = deneme_detaylari.deneme_id
    and denemeler.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.denemeler
  where denemeler.id = deneme_detaylari.deneme_id
    and denemeler.user_id = (select auth.uid())
));

drop policy if exists "Users own yapamadiklari" on public.yapamadiklari;
create policy "Users own yapamadiklari" on public.yapamadiklari for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users own tekrarlar" on public.tekrarlar;
create policy "Users own tekrarlar" on public.tekrarlar for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users own calisma_suresi" on public.calisma_suresi;
create policy "Users own calisma_suresi" on public.calisma_suresi for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users own notlar" on public.notlar;
create policy "Users own notlar" on public.notlar for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users own pomodoro" on public.pomodoro_kayitlari;
create policy "Users own pomodoro" on public.pomodoro_kayitlari for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
