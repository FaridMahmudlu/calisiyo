-- Versioned YKS curriculum, the two-product billing model, admin plan
-- management and standards-based Web Push storage.

-- -------------------------------------------------------------------------
-- Curriculum: existing content remains the 2027 catalog. 2028 content is
-- sourced from the official MEB Turkiye Yuzyili Maarif Modeli program pages.
-- -------------------------------------------------------------------------
alter table public.profiles
  add column if not exists yks_year smallint not null default 2027;
alter table public.profiles drop constraint if exists profiles_yks_year_check;
alter table public.profiles add constraint profiles_yks_year_check
  check (yks_year in (2027, 2028));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, alan_secimi, yks_year)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Öğrenci'
    ),
    case when new.raw_user_meta_data ->> 'alan_secimi' in ('sayisal', 'esit_agirlik', 'sozel', 'dil')
      then new.raw_user_meta_data ->> 'alan_secimi' else 'sayisal' end,
    case when (new.raw_user_meta_data ->> 'yks_year') in ('2027', '2028')
      then (new.raw_user_meta_data ->> 'yks_year')::smallint else 2027 end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create table if not exists public.curriculum_versions (
  year smallint primary key check (year in (2027, 2028)),
  label text not null,
  description text not null,
  official_source_url text,
  official_source_label text,
  is_officially_announced boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.curriculum_versions (year, label, description, official_source_url, official_source_label, is_officially_announced)
values
  (2027, '2027 YKS müfredatı', 'Mevcut YKS hazırlık kataloğu.', null, null, true),
  (2028, '2028 Türkiye Yüzyılı Maarif Modeli', 'MEB resmi öğretim programlarına göre ayrı ders ve konu kataloğu.', 'https://www.meb.gov.tr/yks-ve-lgsde-yeni-mufredata-uyumlu-soru-modeli-2028de-hayata-gececek/haber/39265/tr', 'T.C. Millî Eğitim Bakanlığı', true)
on conflict (year) do update set
  label = excluded.label, description = excluded.description,
  official_source_url = excluded.official_source_url,
  official_source_label = excluded.official_source_label,
  is_officially_announced = excluded.is_officially_announced,
  updated_at = now();
alter table public.curriculum_versions enable row level security;
revoke all on table public.curriculum_versions from public, anon, authenticated;
grant select on table public.curriculum_versions to anon, authenticated;
drop policy if exists "Curriculum versions are public" on public.curriculum_versions;
create policy "Curriculum versions are public" on public.curriculum_versions for select to anon, authenticated using (true);

alter table public.dersler
  add column if not exists curriculum_year smallint not null default 2027,
  add column if not exists official_source_url text,
  add column if not exists official_source_label text,
  add column if not exists question_count smallint;
alter table public.dersler drop constraint if exists dersler_curriculum_year_check;
alter table public.dersler add constraint dersler_curriculum_year_check
  check (curriculum_year in (2027, 2028));
alter table public.dersler drop constraint if exists dersler_question_count_check;
alter table public.dersler add constraint dersler_question_count_check
  check (question_count is null or question_count between 1 and 120);
create unique index if not exists dersler_catalog_unique_idx
  on public.dersler (ad, sinav_turu, curriculum_year);

alter table public.konular
  add column if not exists grade_level smallint,
  add column if not exists official_source_url text;
alter table public.konular drop constraint if exists konular_grade_level_check;
alter table public.konular add constraint konular_grade_level_check
  check (grade_level is null or grade_level between 9 and 12);
create unique index if not exists konular_versioned_unique_idx
  on public.konular (ders_id, ad, grade_level) nulls not distinct;

update public.dersler set question_count = case
  when sinav_turu = 'TYT' and ad in ('Türkçe', 'Matematik') then 40
  when sinav_turu = 'TYT' and ad in ('Fizik', 'Kimya') then 7
  when sinav_turu = 'TYT' and ad = 'Biyoloji' then 6
  when sinav_turu = 'TYT' and ad in ('Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü') then 5
  when sinav_turu = 'AYT' and ad = 'Matematik' then 40
  when sinav_turu = 'AYT' and ad = 'Edebiyat' then 24
  when sinav_turu = 'AYT' and ad = 'Fizik' then 14
  when sinav_turu = 'AYT' and ad in ('Kimya', 'Biyoloji') then 13
  when sinav_turu = 'YDT' then 80
  else question_count
end
where curriculum_year = 2027;

insert into public.dersler (
  ad, sinav_turu, alan, renk, ikon, sira, curriculum_year,
  official_source_url, official_source_label, question_count
)
select ad, sinav_turu, alan, renk, ikon, sira, 2028, source_url,
  'MEB Türkiye Yüzyılı Maarif Modeli', null
from (values
  ('Türkçe','TYT',array['sayisal','esit_agirlik','sozel','dil']::text[],'#10B981','📖',1,'https://tymm.meb.gov.tr/ogretim-programlari/ders/turk-dili-ve-edebiyati-dersi'),
  ('Matematik','TYT',array['sayisal','esit_agirlik','sozel','dil']::text[],'#3B82F6','📐',2,'https://tymm.meb.gov.tr/ogretim-programlari/ders/matematik-dersi'),
  ('Fizik','TYT',array['sayisal','esit_agirlik']::text[],'#8B5CF6','⚡',3,'https://tymm.meb.gov.tr/ogretim-programlari/ders/fizik-dersi'),
  ('Kimya','TYT',array['sayisal','esit_agirlik']::text[],'#F59E0B','🧪',4,'https://tymm.meb.gov.tr/ogretim-programlari/ders/kimya-dersi'),
  ('Biyoloji','TYT',array['sayisal','esit_agirlik']::text[],'#EF4444','🧬',5,'https://tymm.meb.gov.tr/ogretim-programlari/ders/biyoloji-dersi'),
  ('Tarih','TYT',array['sayisal','esit_agirlik','sozel','dil']::text[],'#6366F1','📜',6,'https://tymm.meb.gov.tr/ogretim-programlari/ders/tarih-dersi'),
  ('Coğrafya','TYT',array['sayisal','esit_agirlik','sozel','dil']::text[],'#14B8A6','🌍',7,'https://tymm.meb.gov.tr/ogretim-programlari/ders/cografya-dersi'),
  ('Felsefe','TYT',array['sayisal','esit_agirlik','sozel','dil']::text[],'#EC4899','💡',8,'https://tymm.meb.gov.tr/ogretim-programlari/ders/felsefe-dersi'),
  ('Din Kültürü','TYT',array['sayisal','esit_agirlik','sozel','dil']::text[],'#F97316','📿',9,'https://tymm.meb.gov.tr/ogretim-programlari/ders/din-kulturu-ve-ahlak-bilgisi-dersi-2'),
  ('Matematik','AYT',array['sayisal','esit_agirlik']::text[],'#3B82F6','📊',10,'https://tymm.meb.gov.tr/ogretim-programlari/ders/matematik-dersi'),
  ('Fizik','AYT',array['sayisal']::text[],'#8B5CF6','🔬',11,'https://tymm.meb.gov.tr/ogretim-programlari/ders/fizik-dersi'),
  ('Kimya','AYT',array['sayisal']::text[],'#F59E0B','⚗️',12,'https://tymm.meb.gov.tr/ogretim-programlari/ders/kimya-dersi'),
  ('Biyoloji','AYT',array['sayisal']::text[],'#EF4444','🔭',13,'https://tymm.meb.gov.tr/ogretim-programlari/ders/biyoloji-dersi'),
  ('Edebiyat','AYT',array['esit_agirlik','sozel']::text[],'#EC4899','✍️',14,'https://tymm.meb.gov.tr/ogretim-programlari/ders/turk-dili-ve-edebiyati-dersi'),
  ('Tarih','AYT',array['esit_agirlik','sozel']::text[],'#6366F1','🏛️',15,'https://tymm.meb.gov.tr/ogretim-programlari/ders/tarih-dersi'),
  ('Coğrafya','AYT',array['esit_agirlik','sozel']::text[],'#14B8A6','🗺️',16,'https://tymm.meb.gov.tr/ogretim-programlari/ders/cografya-dersi'),
  ('Felsefe','AYT',array['sozel']::text[],'#EC4899','💭',17,'https://tymm.meb.gov.tr/ogretim-programlari/ders/felsefe-dersi'),
  ('İngilizce','YDT',array['dil']::text[],'#3B82F6','🌐',18,'https://tymm.meb.gov.tr/ogretim-programlari/ders/ingilizce-dersi-9-12')
) as seed(ad, sinav_turu, alan, renk, ikon, sira, source_url)
on conflict (ad, sinav_turu, curriculum_year) do update set
  alan = excluded.alan,
  renk = excluded.renk,
  ikon = excluded.ikon,
  sira = excluded.sira,
  official_source_url = excluded.official_source_url,
  official_source_label = excluded.official_source_label;

-- A concise, trackable catalog of the official grade themes/units. A theme is
-- duplicated into TYT/AYT only where the same official high-school program
-- feeds both exam views; it remains isolated from every 2027 row by course id.
with official_topics(program_name, grade_level, sira, ad, source_url) as (values
  ('Matematik',9,1,'Sayılar','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11'),
  ('Matematik',9,2,'Nicelikler ve Değişimler','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11'),
  ('Matematik',9,3,'Geometrik Şekiller','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11'),
  ('Matematik',9,4,'Eşlik ve Benzerlik','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11'),
  ('Matematik',9,5,'Algoritma ve Bilişim','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11'),
  ('Matematik',9,6,'İstatistiksel Araştırma Süreci','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11'),
  ('Matematik',9,7,'Veriden Olasılığa','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11'),
  ('Matematik',10,1,'Geometrik Şekiller','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12'),
  ('Matematik',10,2,'İstatistiksel Araştırma Süreci','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12'),
  ('Matematik',10,3,'Sayılar','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12'),
  ('Matematik',10,4,'Nicelikler ve Değişimler','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12'),
  ('Matematik',10,5,'Sayma, Algoritma ve Bilişim','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12'),
  ('Matematik',10,6,'Analitik İnceleme','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12'),
  ('Matematik',10,7,'Veriden Olasılığa','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12'),
  ('Matematik',11,1,'İstatistiksel Araştırma Süreci','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/13'),
  ('Matematik',11,2,'Geometrik Şekiller','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/13'),
  ('Matematik',11,3,'Nicelikler ve Değişimler I','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/13'),
  ('Matematik',11,4,'Nicelikler ve Değişimler II','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/13'),
  ('Matematik',11,5,'Nicelikler ve Değişimler III','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/13'),
  ('Matematik',12,1,'Nicelikler ve Değişimler I','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/14'),
  ('Matematik',12,2,'Nicelikler ve Değişimler II','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/14'),
  ('Matematik',12,3,'Geometrik Şekiller','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/14'),
  ('Matematik',12,4,'Geometrik Cisimler','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/14'),
  ('Matematik',12,5,'Değişimin Matematiği I','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/14'),
  ('Matematik',12,6,'Değişimin Matematiği II','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/14'),
  ('Matematik',12,7,'Değişimin Matematiği III','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/14'),
  ('Matematik',12,8,'Hazır Veriler Üzerinde Çalışma','https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/14'),

  ('Fizik',9,1,'Fizik Bilimi ve Kariyer Keşfi','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/11'),
  ('Fizik',9,2,'Kuvvet ve Hareket','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/11'),
  ('Fizik',9,3,'Akışkanlar','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/11'),
  ('Fizik',9,4,'Enerji','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/11'),
  ('Fizik',10,1,'Kuvvet ve Hareket','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/12'),
  ('Fizik',10,2,'Enerji','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/12'),
  ('Fizik',10,3,'Elektrik','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/12'),
  ('Fizik',10,4,'Dalgalar','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/12'),
  ('Fizik',11,1,'Kuvvet ve Hareket','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/13'),
  ('Fizik',11,2,'Elektrik ve Manyetizma','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/13'),
  ('Fizik',11,3,'Optik','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/13'),
  ('Fizik',12,1,'Kuvvet ve Hareket','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/14'),
  ('Fizik',12,2,'Enerji','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/14'),
  ('Fizik',12,3,'Dalgalar','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/14'),
  ('Fizik',12,4,'Madde ve Doğası','https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/14'),

  ('Kimya',9,1,'Etkileşim','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/11'),
  ('Kimya',9,2,'Çeşitlilik','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/11'),
  ('Kimya',9,3,'Sürdürülebilirlik','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/11'),
  ('Kimya',10,1,'Etkileşim','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/12'),
  ('Kimya',10,2,'Çeşitlilik','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/12'),
  ('Kimya',10,3,'Sürdürülebilirlik','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/12'),
  ('Kimya',11,1,'Etkileşim','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/13'),
  ('Kimya',11,2,'Çeşitlilik','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/13'),
  ('Kimya',11,3,'Sürdürülebilirlik','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/13'),
  ('Kimya',12,1,'Etkileşim','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/14'),
  ('Kimya',12,2,'Çeşitlilik','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/14'),
  ('Kimya',12,3,'Sürdürülebilirlik','https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/14'),

  ('Biyoloji',9,1,'Yaşam','https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/11'),
  ('Biyoloji',9,2,'Organizasyon','https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/11'),
  ('Biyoloji',10,1,'Enerji','https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/12'),
  ('Biyoloji',10,2,'Ekoloji','https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/12'),
  ('Biyoloji',11,1,'Tepki','https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/13'),
  ('Biyoloji',11,2,'Homeostazi','https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/13'),
  ('Biyoloji',12,1,'Üreme','https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/14'),
  ('Biyoloji',12,2,'Gen','https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/14'),

  ('Türk Dili ve Edebiyatı',9,1,'Sözün İnceliği','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/11'),
  ('Türk Dili ve Edebiyatı',9,2,'Anlam Arayışı','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/11'),
  ('Türk Dili ve Edebiyatı',9,3,'Anlamın Yapı Taşları','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/11'),
  ('Türk Dili ve Edebiyatı',9,4,'Dilin Zenginliği','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/11'),
  ('Türk Dili ve Edebiyatı',10,1,'Sözün Ezgisi','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/12'),
  ('Türk Dili ve Edebiyatı',10,2,'Kelimelerin Ritmi','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/12'),
  ('Türk Dili ve Edebiyatı',10,3,'Dünden Bugüne','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/12'),
  ('Türk Dili ve Edebiyatı',10,4,'Nesillerin Mirası','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/12'),
  ('Türk Dili ve Edebiyatı',11,1,'Bir Diyeceğim Var!','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/13'),
  ('Türk Dili ve Edebiyatı',11,2,'Kültür Yolculuğu','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/13'),
  ('Türk Dili ve Edebiyatı',11,3,'Yaşamın İzinde','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/13'),
  ('Türk Dili ve Edebiyatı',11,4,'Hayatın Aynası','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/13'),
  ('Türk Dili ve Edebiyatı',12,1,'Benim Yolculuğum','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/14'),
  ('Türk Dili ve Edebiyatı',12,2,'Toplumun Ahengi','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/14'),
  ('Türk Dili ve Edebiyatı',12,3,'Hayatın Dengesi','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/14'),
  ('Türk Dili ve Edebiyatı',12,4,'Hayalimdeki Yarın','https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/14'),

  ('Tarih',9,1,'Geçmişin İnşa Sürecinde Tarih','https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/11'),
  ('Tarih',9,2,'Eski Çağ Medeniyetleri','https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/11'),
  ('Tarih',9,3,'Orta Çağ Medeniyetleri','https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/11'),
  ('Tarih',10,1,'Türkistan’dan Türkiye’ye (1040-1299)','https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/12'),
  ('Tarih',10,2,'Beylikten Devlete Osmanlı (1299-1453)','https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/12'),
  ('Tarih',10,3,'Cihan Devleti Osmanlı (1453-1683)','https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/12'),
  ('Tarih',11,1,'Değişen Dünyada Osmanlı Devleti (1683-1789)','https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/13'),
  ('Tarih',11,2,'Dönüşüm Sürecinde Osmanlı (1789-1908)','https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/13'),
  ('Tarih',11,3,'Savaşlar Sarmalında Osmanlı (1908-1918)','https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/13'),

  ('Felsefe',10,1,'Felsefenin Doğası','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/12'),
  ('Felsefe',10,2,'Felsefe, Mantık ve Argümantasyon','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/12'),
  ('Felsefe',10,3,'Varlık Felsefesi','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/12'),
  ('Felsefe',10,4,'Bilgi Felsefesi','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/12'),
  ('Felsefe',10,5,'Ahlak Felsefesi','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/12'),
  ('Felsefe',10,6,'Estetik ve Sanat Felsefesi','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/12'),
  ('Felsefe',10,7,'Siyaset Felsefesi','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/12'),
  ('Felsefe',10,8,'Din Felsefesi','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/12'),
  ('Felsefe',10,9,'Bilim Felsefesi','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/12'),
  ('Felsefe',11,1,'Çevre Sorunları ve Felsefe','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/13'),
  ('Felsefe',11,2,'Teknoloji ve Hayat','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/13'),
  ('Felsefe',11,3,'Akıl ve İnanç','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/13'),
  ('Felsefe',11,4,'Edebiyat ve Felsefe','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/13'),
  ('Felsefe',11,5,'Hayatın Anlamı','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/13'),
  ('Felsefe',11,6,'Hukuk ve Felsefe','https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/13'),

  ('Coğrafya',9,1,'Coğrafyanın Doğası','https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/11'),
  ('Coğrafya',9,2,'Mekânsal Bilgi Teknolojileri','https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/11'),
  ('Coğrafya',9,3,'Doğal Sistemler ve Süreçler','https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/11'),
  ('Coğrafya',9,4,'Beşerî Sistemler ve Süreçler','https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/11'),
  ('Coğrafya',9,5,'Ekonomik Faaliyetler ve Etkileri','https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/11'),
  ('Coğrafya',9,6,'Afetler ve Sürdürülebilir Çevre','https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/11'),
  ('Coğrafya',9,7,'Bölgeler, Ülkeler ve Küresel Bağlantılar','https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/11'),

  ('Din Kültürü',9,1,'Allah-İnsan İlişkisi','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/11'),
  ('Din Kültürü',9,2,'İslam’da İnanç Esasları','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/11'),
  ('Din Kültürü',9,3,'İslam’da İbadetler','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/11'),
  ('Din Kültürü',9,4,'İslam’da Ahlak İlkeleri','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/11'),
  ('Din Kültürü',9,5,'Kur’an’a Göre Hz. Muhammed','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/11'),
  ('Din Kültürü',10,1,'İslam’da Varlık ve Bilgi','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/12'),
  ('Din Kültürü',10,2,'Allah’ı Tanımak','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/12'),
  ('Din Kültürü',10,3,'İslam’ın Evrensel Mesajları','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/12'),
  ('Din Kültürü',10,4,'Din, Çevre ve Teknoloji','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/12'),
  ('Din Kültürü',10,5,'İslam Düşüncesinde Yorumlar','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/12'),
  ('Din Kültürü',11,1,'Kader, İrade ve Sorumluluk','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/13'),
  ('Din Kültürü',11,2,'Din, Felsefe, Bilim ve Sanat','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/13'),
  ('Din Kültürü',11,3,'İslam Medeniyeti ve Gönül Coğrafyamız','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/13'),
  ('Din Kültürü',11,4,'İnançla İlgili Meseleler','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/13'),
  ('Din Kültürü',11,5,'Yahudilik ve Hristiyanlık','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/13'),
  ('Din Kültürü',12,1,'Kur’an-ı Kerim','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/14'),
  ('Din Kültürü',12,2,'Din ve Aile','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/14'),
  ('Din Kültürü',12,3,'Güncel Dinî Meseleler','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/14'),
  ('Din Kültürü',12,4,'İslam Düşüncesinde Tasavvufi Yorumlar','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/14'),
  ('Din Kültürü',12,5,'Hint ve Çin Dinleri','https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/14'),

  ('İngilizce',9,1,'School Life','https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/11'),
  ('İngilizce',9,2,'Classroom Life','https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/11'),
  ('İngilizce',9,3,'Personal Life','https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/11'),
  ('İngilizce',9,4,'Family Life','https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/11'),
  ('İngilizce',9,5,'House and Neighbourhood','https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/11'),
  ('İngilizce',9,6,'City and Country','https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/11'),
  ('İngilizce',9,7,'World and Nature','https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/11'),
  ('İngilizce',9,8,'Universe and Future','https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/11')
)
insert into public.konular (ders_id, ad, sira, grade_level, official_source_url)
select course.id,
  official.ad,
  official.grade_level * 100 + official.sira,
  official.grade_level,
  official.source_url
from official_topics as official
join public.dersler as course
  on course.curriculum_year = 2028
  and (
    course.ad = official.program_name
    or (official.program_name = 'Türk Dili ve Edebiyatı' and course.ad in ('Türkçe', 'Edebiyat'))
  )
on conflict (ders_id, ad, grade_level) do update set
  sira = excluded.sira,
  official_source_url = excluded.official_source_url;

-- -------------------------------------------------------------------------
-- Exactly two public products: calisiyo ucretsiz and calisiyo plus. Plus has
-- two exam-year SKUs, but is presented as one product with a year selector.
-- -------------------------------------------------------------------------
alter table public.billing_plans drop constraint if exists billing_plans_code_valid;
alter table public.billing_plans add constraint billing_plans_code_valid
  check (code in ('baslangic', 'odak', 'zirve', 'plus_2027', 'plus_2028'));

update public.billing_plans set
  name = 'calisiyo ücretsiz',
  tagline = 'Düzenini ücretsiz kur',
  description = 'Planlama, Pomodoro ve gerçek çalışma verileriyle temel takip.',
  monthly_price = 0,
  annual_price = 0,
  entitlements = '{"future_schedule_days":60,"active_task_limit":200,"exam_monthly_limit":10,"note_limit":100,"youtube_import_monthly_limit":2,"classroom_create_limit":1,"classroom_join_limit":3,"classroom_member_limit":8,"avatar_customization":true,"stats_history_days":30,"progress_export":false,"premium_badge":false}'::jsonb,
  is_active = true,
  sort_order = 1,
  updated_at = now()
where code = 'baslangic';

insert into public.billing_plans (
  code, name, tagline, description, monthly_price, annual_price, currency,
  entitlements, is_active, sort_order
) values
  ('plus_2027','calisiyo plus','2027 YKS’ye kadar','2027 YKS hazırlığını sınava kadar geniş limitlerle sürdür.',2000,2000,'TRY',
   '{"future_schedule_days":730,"active_task_limit":2000,"exam_monthly_limit":120,"note_limit":2000,"youtube_import_monthly_limit":30,"classroom_create_limit":10,"classroom_join_limit":30,"classroom_member_limit":50,"avatar_customization":true,"stats_history_days":3650,"progress_export":true,"premium_badge":true}'::jsonb,true,2),
  ('plus_2028','calisiyo plus','2028 için 5+1 ay','Türkiye Yüzyılı Maarif Modeli ile 6 aylık genişletilmiş hazırlık.',1000,1000,'TRY',
   '{"future_schedule_days":730,"active_task_limit":2000,"exam_monthly_limit":120,"note_limit":2000,"youtube_import_monthly_limit":30,"classroom_create_limit":10,"classroom_join_limit":30,"classroom_member_limit":50,"avatar_customization":true,"stats_history_days":3650,"progress_export":true,"premium_badge":true}'::jsonb,true,3)
on conflict (code) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  currency = excluded.currency,
  entitlements = excluded.entitlements,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.user_subscriptions
set plan_code = 'plus_2027', updated_at = now()
where plan_code in ('odak', 'zirve') and status = 'active';
update public.billing_plans set is_active = false, updated_at = now()
where code in ('odak', 'zirve');

alter table public.billing_orders drop constraint if exists billing_orders_billing_period_check;
alter table public.billing_orders add constraint billing_orders_billing_period_check
  check (billing_period in ('monthly', 'annual', 'yks_2027', 'six_months'));

alter table public.user_subscriptions
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz;
alter table public.user_subscriptions drop constraint if exists user_subscriptions_status_check;
alter table public.user_subscriptions add constraint user_subscriptions_status_check
  check (status in ('trialing', 'active', 'expired', 'cancelled', 'refunded'));

create or replace function public.current_plan_details()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  selected_plan public.billing_plans%rowtype;
  subscription_row public.user_subscriptions%rowtype;
begin
  if viewer is null then
    raise exception using errcode = '42501', message = 'Oturum gerekli.';
  end if;
  select * into subscription_row
  from public.user_subscriptions
  where user_id = viewer
    and status in ('active', 'trialing')
    and current_period_end > now()
  limit 1;
  select * into selected_plan
  from public.billing_plans
  where code = coalesce(subscription_row.plan_code, 'baslangic') and is_active
  limit 1;
  if selected_plan.code is null then
    select * into selected_plan from public.billing_plans where code = 'baslangic' limit 1;
  end if;
  return jsonb_build_object(
    'code', selected_plan.code,
    'name', selected_plan.name,
    'entitlements', selected_plan.entitlements,
    'status', coalesce(subscription_row.status, 'free'),
    'periodStart', subscription_row.current_period_start,
    'periodEnd', subscription_row.current_period_end,
    'trialStartedAt', subscription_row.trial_started_at,
    'trialEndsAt', subscription_row.trial_ends_at,
    'targetYear', case when selected_plan.code = 'plus_2028' then 2028 when selected_plan.code = 'plus_2027' then 2027 else null end,
    'cancelAtPeriodEnd', coalesce(subscription_row.cancel_at_period_end, true)
  );
end;
$$;

create or replace function public.start_plus_trial(p_plan_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  started_at timestamptz := now();
  ends_at timestamptz := now() + interval '7 days';
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
  end if;
  perform public.lock_current_user_mutation('plan');
  if p_plan_code not in ('plus_2027', 'plus_2028') then
    raise exception using errcode = '22023', message = 'Geçerli bir plus seçeneği gerekli.';
  end if;
  if exists (select 1 from public.user_subscriptions where user_id = viewer) then
    raise exception using errcode = '23505', message = 'Ücretsiz deneme hakkı daha önce kullanılmış veya etkin bir plan var.';
  end if;
  insert into public.user_subscriptions (
    user_id, plan_code, status, current_period_start, current_period_end,
    source_order_id, cancel_at_period_end, trial_started_at, trial_ends_at
  ) values (
    viewer, p_plan_code, 'trialing', started_at, ends_at,
    null, true, started_at, ends_at
  );
  insert into public.billing_events (user_id, event_type, payload, actor_id)
  values (viewer, 'trial_started', jsonb_build_object('plan', p_plan_code, 'endsAt', ends_at), viewer);
  insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
  values (viewer, 'success', '7 günlük plus denemen başladı',
    'Deneme süren boyunca plus limitlerini kullanabilirsin. Süre sonunda otomatik ücret alınmaz.',
    '/dashboard/abonelik', 'plus-trial-started')
  on conflict (user_id, dedupe_key) do nothing;
  return jsonb_build_object('status', 'trialing', 'planCode', p_plan_code, 'trialEndsAt', ends_at);
end;
$$;
revoke all on function public.start_plus_trial(text) from public, anon, authenticated;
grant execute on function public.start_plus_trial(text) to authenticated;

create or replace function public.create_billing_order(
  p_plan_code text,
  p_billing_period text,
  p_legal_versions jsonb,
  p_legal_snapshot_hash text,
  p_immediate_service_consent boolean,
  p_adult_or_guardian_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  selected_plan public.billing_plans%rowtype;
  created_order public.billing_orders%rowtype;
  chosen_amount numeric(10,2);
  generated_order_number text;
  legal_key text;
  legal_version text;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
  end if;
  perform public.lock_current_user_mutation('plan');
  if not ((p_plan_code = 'plus_2027' and p_billing_period = 'yks_2027')
    or (p_plan_code = 'plus_2028' and p_billing_period = 'six_months')) then
    raise exception using errcode = '22023', message = 'Geçersiz plus seçeneği veya dönem.';
  end if;
  if not coalesce(p_immediate_service_consent, false) or not coalesce(p_adult_or_guardian_confirmed, false) then
    raise exception using errcode = '22023', message = 'Zorunlu onaylar tamamlanmalıdır.';
  end if;
  if jsonb_typeof(p_legal_versions) <> 'object'
     or not (p_legal_versions ?& array['on_bilgilendirme', 'mesafeli_satis', 'iptal_iade', 'kvkk'])
     or length(coalesce(p_legal_snapshot_hash, '')) not between 32 and 128 then
    raise exception using errcode = '22023', message = 'Yasal belge kaydı geçersiz.';
  end if;
  if (select count(*) from public.billing_orders where user_id = viewer
      and created_at > now() - interval '1 hour'
      and status in ('created', 'payment_link_ready', 'awaiting_review')) >= 3 then
    raise exception using errcode = '42901', message = 'Çok fazla açık sipariş var. Lütfen daha sonra tekrar deneyin.';
  end if;
  select * into selected_plan from public.billing_plans
  where code = p_plan_code and is_active limit 1;
  if selected_plan.code is null then
    raise exception using errcode = 'P0002', message = 'Plan satışa açık değil.';
  end if;
  chosen_amount := selected_plan.annual_price;
  generated_order_number := 'CAL-' || to_char(now() at time zone 'Europe/Istanbul', 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.billing_orders (
    order_number, user_id, plan_code, billing_period, amount, currency,
    iyzico_conversation_id, legal_versions, legal_snapshot_hash,
    immediate_service_consent, adult_or_guardian_confirmed
  ) values (
    generated_order_number, viewer, selected_plan.code, p_billing_period, chosen_amount, selected_plan.currency,
    generated_order_number, p_legal_versions, p_legal_snapshot_hash, true, true
  ) returning * into created_order;
  for legal_key, legal_version in select key, value from jsonb_each_text(p_legal_versions) loop
    insert into public.billing_legal_acceptances (order_id, user_id, document_key, document_version, snapshot_hash)
    values (created_order.id, viewer, legal_key, legal_version, p_legal_snapshot_hash);
  end loop;
  insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
  values (created_order.id, viewer, 'order_created',
    jsonb_build_object('plan', selected_plan.code, 'period', p_billing_period, 'amount', chosen_amount, 'currency', selected_plan.currency), viewer);
  return jsonb_build_object(
    'id', created_order.id, 'orderNumber', created_order.order_number,
    'conversationId', created_order.iyzico_conversation_id,
    'planCode', created_order.plan_code, 'planName', selected_plan.name,
    'billingPeriod', created_order.billing_period, 'amount', created_order.amount,
    'currency', created_order.currency, 'status', created_order.status
  );
end;
$$;
revoke all on function public.create_billing_order(text, text, jsonb, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.create_billing_order(text, text, jsonb, text, boolean, boolean) to authenticated;

create or replace function public.admin_set_user_plan(p_user_id uuid, p_plan_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  starts_at timestamptz := now();
  ends_at timestamptz;
begin
  perform public.assert_admin('admin');
  if p_plan_code not in ('baslangic', 'plus_2027', 'plus_2028') then
    raise exception using errcode = '22023', message = 'Geçersiz plan.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'Kullanıcı bulunamadı.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:billing:' || p_user_id::text, 0));
  if p_plan_code = 'baslangic' then
    update public.user_subscriptions set status = 'cancelled', current_period_end = now(), updated_at = now()
    where user_id = p_user_id and current_period_end > now();
    ends_at := now();
  else
    ends_at := case when p_plan_code = 'plus_2027'
      then timestamptz '2027-08-19 23:59:59+03'
      else now() + interval '6 months' end;
    insert into public.user_subscriptions (
      user_id, plan_code, status, current_period_start, current_period_end,
      source_order_id, cancel_at_period_end, trial_started_at, trial_ends_at
    ) values (p_user_id, p_plan_code, 'active', starts_at, ends_at, null, true, null, null)
    on conflict (user_id) do update set
      plan_code = excluded.plan_code, status = 'active',
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      source_order_id = null, cancel_at_period_end = true,
      trial_started_at = null, trial_ends_at = null, updated_at = now();
  end if;
  insert into public.admin_audit_log (actor_id, action, target_user_id, details)
  values (actor, 'user_plan_changed', p_user_id, jsonb_build_object('plan', p_plan_code, 'periodEnd', ends_at));
  insert into public.admin_live_events (event_type, user_id, payload)
  values ('admin_user_plan', p_user_id, jsonb_build_object('plan', p_plan_code, 'periodEnd', ends_at));
  insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
  values (p_user_id, 'info', 'Planın güncellendi',
    case when p_plan_code = 'baslangic' then 'Hesabın calisiyo ücretsiz planına geçirildi.'
      else 'Hesabında calisiyo plus etkinleştirildi.' end,
    '/dashboard/abonelik', 'admin-plan-' || extract(epoch from now())::bigint::text);
  return jsonb_build_object('userId', p_user_id, 'planCode', p_plan_code, 'periodEnd', ends_at);
end;
$$;
revoke all on function public.admin_set_user_plan(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_user_plan(uuid, text) to authenticated;

create or replace function public.admin_get_user_plan(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  perform public.assert_admin('moderator');
  select jsonb_build_object(
    'code', coalesce(plan.code, 'baslangic'),
    'name', coalesce(plan.name, 'calisiyo ücretsiz'),
    'status', coalesce(subscription.status, 'free'),
    'periodStart', subscription.current_period_start,
    'periodEnd', subscription.current_period_end,
    'trialEndsAt', subscription.trial_ends_at
  ) into result
  from (select p_user_id as user_id) as requested
  left join public.user_subscriptions as subscription
    on subscription.user_id = requested.user_id and subscription.current_period_end > now()
  left join public.billing_plans as plan on plan.code = subscription.plan_code;
  return coalesce(result, jsonb_build_object('code','baslangic','name','calisiyo ücretsiz','status','free'));
end;
$$;
revoke all on function public.admin_get_user_plan(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_user_plan(uuid) to authenticated;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_subscriptions'
  ) then
    alter publication supabase_realtime add table public.user_subscriptions;
  end if;
end $$;

-- -------------------------------------------------------------------------
-- Free standards-based Web Push subscriptions. Private keys remain server
-- environment variables; only browser endpoint material is stored here.
-- -------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null check (char_length(p256dh) between 40 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter table public.notifications
  add column if not exists push_dispatched_at timestamptz;
create index if not exists notifications_push_pending_idx
  on public.notifications (created_at)
  where push_dispatched_at is null;

-- Purchased access uses the selected product duration instead of the legacy
-- monthly/annual calculation. Approval stays serialized per account.
create or replace function public.admin_review_billing_order(
  p_order_id uuid,
  p_decision text,
  p_payment_reference text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  order_row public.billing_orders%rowtype;
  existing_subscription public.user_subscriptions%rowtype;
  period_start timestamptz;
  period_end timestamptz;
begin
  perform public.assert_admin('admin');
  if p_decision not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'Geçersiz inceleme kararı.';
  end if;
  if p_decision = 'approve' and length(trim(coalesce(p_payment_reference, ''))) < 4 then
    raise exception using errcode = '22023', message = 'iyzico ödeme referansı zorunludur.';
  end if;
  select * into order_row from public.billing_orders
  where id = p_order_id and status = 'awaiting_review' for update;
  if order_row.id is null then
    raise exception using errcode = 'P0002', message = 'İncelenecek sipariş bulunamadı.';
  end if;
  if p_decision = 'reject' then
    update public.billing_orders set status = 'rejected', verified_by = actor, verified_at = now(),
      decision_note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now()
    where id = order_row.id;
    insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
    values (order_row.id, order_row.user_id, 'order_rejected', jsonb_build_object('note', nullif(trim(coalesce(p_note, '')), '')), actor);
    return jsonb_build_object('id', order_row.id, 'status', 'rejected');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calisiyo:billing:' || order_row.user_id::text, 0));
  if exists (select 1 from public.billing_orders where payment_reference = trim(p_payment_reference)
    and status in ('approved', 'refunded') and id <> order_row.id) then
    raise exception using errcode = '23505', message = 'Bu ödeme referansı daha önce kullanılmış.';
  end if;
  select * into existing_subscription from public.user_subscriptions
  where user_id = order_row.user_id for update;
  if order_row.plan_code = 'plus_2027' then
    period_start := now();
    period_end := timestamptz '2027-08-19 23:59:59+03';
    if period_end <= period_start then
      raise exception using errcode = '22023', message = '2027 YKS paketi satış süresini tamamladı.';
    end if;
  else
    period_start := case when existing_subscription.current_period_end > now()
      then existing_subscription.current_period_start else now() end;
    period_end := greatest(coalesce(existing_subscription.current_period_end, now()), now()) + interval '6 months';
  end if;
  insert into public.user_subscriptions (
    user_id, plan_code, status, current_period_start, current_period_end,
    source_order_id, cancel_at_period_end, trial_started_at, trial_ends_at
  ) values (
    order_row.user_id, order_row.plan_code, 'active', period_start, period_end,
    order_row.id, true, null, null
  ) on conflict (user_id) do update set
    plan_code = excluded.plan_code, status = 'active', current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end, source_order_id = excluded.source_order_id,
    cancel_at_period_end = true, trial_started_at = null, trial_ends_at = null, updated_at = now();
  update public.billing_orders set status = 'approved', payment_reference = trim(p_payment_reference),
    verified_by = actor, verified_at = now(), decision_note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now()
  where id = order_row.id;
  insert into public.billing_events (order_id, user_id, event_type, payload, actor_id)
  values (order_row.id, order_row.user_id, 'order_approved',
    jsonb_build_object('paymentReference', trim(p_payment_reference), 'periodStart', period_start, 'periodEnd', period_end), actor);
  insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
  values (order_row.user_id, 'success', 'calisiyo plus etkinleştirildi',
    'Plus erişimin ' || to_char(period_end at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ' tarihine kadar açık.',
    '/dashboard/abonelik', 'billing-approved-' || order_row.id::text)
  on conflict (user_id, dedupe_key) do nothing;
  return jsonb_build_object('id', order_row.id, 'status', 'approved', 'periodStart', period_start, 'periodEnd', period_end);
end;
$$;
revoke all on function public.admin_review_billing_order(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_review_billing_order(uuid, text, text, text) to authenticated;

-- Exam + subject rows are committed atomically so a partial result can never
-- appear in charts when one detail fails validation.
create or replace function public.create_exam_with_details(
  p_exam_type text,
  p_publisher text,
  p_exam_date date,
  p_duration_minutes integer,
  p_details jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  viewer_year smallint;
  created_id uuid;
  item jsonb;
  course public.dersler%rowtype;
  correct_count integer;
  wrong_count integer;
  blank_count integer;
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
  end if;
  if p_exam_type not in ('TYT', 'AYT', 'YDT') then
    raise exception using errcode = '22023', message = 'Geçersiz sınav türü.';
  end if;
  if length(trim(coalesce(p_publisher, ''))) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Yayın adı 2-120 karakter olmalıdır.';
  end if;
  if p_exam_date is null or p_exam_date > (now() at time zone 'Europe/Istanbul')::date then
    raise exception using errcode = '22023', message = 'Deneme tarihi bugün veya daha eski olmalıdır.';
  end if;
  if p_duration_minutes is not null and p_duration_minutes not between 1 and 600 then
    raise exception using errcode = '22023', message = 'Deneme süresi 1-600 dakika olmalıdır.';
  end if;
  if jsonb_typeof(p_details) <> 'array' or jsonb_array_length(p_details) = 0 then
    raise exception using errcode = '22023', message = 'En az bir ders sonucu girmelisin.';
  end if;
  select yks_year into viewer_year from public.profiles where id = viewer;
  insert into public.denemeler (user_id, sinav_turu, yayin, tarih, sure_dakika)
  values (viewer, p_exam_type, trim(p_publisher), p_exam_date, p_duration_minutes)
  returning id into created_id;
  for item in select value from jsonb_array_elements(p_details) loop
    select * into course from public.dersler
    where id = (item->>'ders_id')::uuid
      and sinav_turu = p_exam_type
      and curriculum_year = coalesce(viewer_year, 2027);
    if course.id is null then
      raise exception using errcode = '22023', message = 'Ders seçimi bu sınav yılıyla eşleşmiyor.';
    end if;
    correct_count := coalesce((item->>'dogru')::integer, 0);
    wrong_count := coalesce((item->>'yanlis')::integer, 0);
    blank_count := coalesce((item->>'bos')::integer, 0);
    if least(correct_count, wrong_count, blank_count) < 0 then
      raise exception using errcode = '22023', message = 'Soru sayıları negatif olamaz.';
    end if;
    if course.question_count is not null and correct_count + wrong_count + blank_count > course.question_count then
      raise exception using errcode = '22023', message = course.ad || ' için soru sayısı resmi üst sınırı aşıyor.';
    end if;
    insert into public.deneme_detaylari (deneme_id, ders_id, dogru, yanlis, bos)
    values (created_id, course.id, correct_count, wrong_count, blank_count);
  end loop;
  return created_id;
end;
$$;
revoke all on function public.create_exam_with_details(text, text, date, integer, jsonb) from public, anon, authenticated;
grant execute on function public.create_exam_with_details(text, text, date, integer, jsonb) to authenticated;

alter table public.youtube_resource_items
  add column if not exists start_offset_seconds integer not null default 0
  check (start_offset_seconds between 0 and 86400);

create or replace function public.import_youtube_learning_plan(p_resource jsonb,p_items jsonb,p_start_date date,p_cadence text,p_daily_minutes integer,p_ders_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid:=(select auth.uid()); resource_id uuid; item jsonb; item_id uuid; item_date date; v_task_id uuid; start_time time; end_time time; duration_minutes integer; created_tasks integer:=0; source_link text; viewer_year smallint;
begin
  if viewer is null or not public.is_active_user() then raise exception using errcode='42501', message='Aktif bir oturum gerekli.'; end if;
  if p_start_date<(now() at time zone 'Europe/Istanbul')::date or p_start_date>(now() at time zone 'Europe/Istanbul')::date+interval '365 days' or p_cadence not in ('daily','weekly') or p_daily_minutes not between 15 and 360 or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 200 then raise exception using errcode='22023', message='Planlama ayarları geçersiz.'; end if;
  select yks_year into viewer_year from public.profiles where id=viewer;
  if p_ders_id is not null and not exists(select 1 from public.dersler where id=p_ders_id and curriculum_year=coalesce(viewer_year,2027)) then raise exception using errcode='22023', message='Ders seçilen YKS yılıyla eşleşmiyor.'; end if;
  if coalesce(p_resource->>'kind','') not in ('youtube_video','youtube_playlist') or coalesce(p_resource->>'url','') !~ '^https://(www\.)?(youtube\.com|youtu\.be)/' then raise exception using errcode='22023', message='Geçerli bir YouTube kaynağı gerekli.'; end if;
  insert into public.kaynaklarim(user_id,custom_ad,custom_yayin,custom_kitap_turu,custom_ders_id,resource_kind,source_url,external_id,duration_minutes,item_count,source_metadata)
  values(viewer,left(trim(p_resource->>'title'),160),coalesce(nullif(trim(p_resource->>'channelTitle'),''),'YouTube'),'video',p_ders_id,p_resource->>'kind',p_resource->>'url',p_resource->>'externalId',nullif(p_resource->>'durationMinutes','')::integer,jsonb_array_length(p_items),p_resource)
  returning id into resource_id;
  for item in select value from jsonb_array_elements(p_items) loop
    if coalesce(item->>'videoId','') !~ '^[A-Za-z0-9_-]{11}$' or char_length(trim(coalesce(item->>'title',''))) not between 1 and 200 or coalesce((item->>'durationSeconds')::integer,0) not between 1 and 86400 or coalesce((item->>'startOffsetSeconds')::integer,0) not between 0 and 86400 then raise exception using errcode='22023', message='Video bilgileri doğrulanamadı.'; end if;
    item_date:=coalesce(nullif(item->>'scheduledDate','')::date,p_start_date);
    if item_date<p_start_date or item_date>p_start_date+365 then raise exception using errcode='22023', message='Video plan tarihi geçersiz.'; end if;
    duration_minutes:=greatest(1,ceil((item->>'durationSeconds')::numeric/60)::integer);
    insert into public.youtube_resource_items(resource_id,user_id,video_id,title,channel_title,thumbnail_url,duration_seconds,position,scheduled_date,start_offset_seconds)
    values(resource_id,viewer,item->>'videoId',trim(item->>'title'),item->>'channelTitle',item->>'thumbnailUrl',(item->>'durationSeconds')::integer,(item->>'position')::integer,item_date,coalesce((item->>'startOffsetSeconds')::integer,0)) returning id into item_id;
    start_time:='17:00';
    loop
      select coalesce(max(bitis_saat),start_time) into start_time from public.gunluk_gorevler where user_id=viewer and tarih=item_date and bitis_saat>start_time;
      end_time:=start_time+make_interval(mins=>least(duration_minutes,360));
      exit when end_time<'23:55';
      item_date:=item_date+1; start_time:='09:00';
    end loop;
    source_link:='https://www.youtube.com/watch?v='||(item->>'videoId');
    if coalesce((item->>'startOffsetSeconds')::integer,0)>0 then source_link:=source_link||'&t='||(item->>'startOffsetSeconds')||'s'; end if;
    insert into public.gunluk_gorevler(user_id,tarih,baslangic_saat,bitis_saat,ders_id,kaynak_id,konu,soru_sayisi,tamamlandi,youtube_item_id,source_url)
    values(viewer,item_date,start_time,end_time,p_ders_id,resource_id,left(trim(item->>'title'),200),0,false,item_id,source_link) returning id into v_task_id;
    update public.youtube_resource_items set task_id=v_task_id,scheduled_date=item_date where id=item_id;
    created_tasks:=created_tasks+1;
  end loop;
  return jsonb_build_object('resourceId',resource_id,'tasksCreated',created_tasks,'itemsCreated',jsonb_array_length(p_items));
end;
$$;
revoke all on function public.import_youtube_learning_plan(jsonb,jsonb,date,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.import_youtube_learning_plan(jsonb,jsonb,date,text,integer,uuid) to authenticated;
