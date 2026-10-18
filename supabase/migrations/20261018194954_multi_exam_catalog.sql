-- Multi-exam deneme tracking: KDS, SDS, LGS, KPSS, ALES, DGS, YDS, YÖKDİL, MSÜ
-- and custom exams next to YKS. YKS (TYT/AYT/YDT) keeps its curriculum-backed
-- create_exam_with_details RPC unchanged; every other exam type is described by
-- the exam_types catalog and stores self-describing sections on deneme_detaylari.
-- Existing rows and older app builds keep working: all new columns have
-- defaults and the YKS net formula (4 yanlış 1 doğruyu götürür) is unchanged.

-- 1. Catalog ---------------------------------------------------------------
create table public.exam_types (
  code text primary key check (code ~ '^[A-Z][A-Z0-9_]{1,23}$'),
  short_name text not null check (char_length(short_name) between 2 and 24),
  name text not null check (char_length(name) between 2 and 120),
  category text not null check (category in ('yks', 'okul', 'lgs', 'kpss', 'lisansustu', 'dil', 'msu', 'diger')),
  description text check (description is null or char_length(description) <= 280),
  color text not null default '#00A870' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  wrong_penalty smallint not null default 4 check (wrong_penalty in (0, 3, 4)),
  penalty_editable boolean not null default false,
  sections_editable boolean not null default false,
  requires_title boolean not null default false,
  uses_curriculum boolean not null default false,
  grade_levels smallint[] not null default '{}'::smallint[],
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  grade_presets jsonb not null default '{}'::jsonb check (jsonb_typeof(grade_presets) = 'object'),
  default_duration_minutes smallint check (default_duration_minutes is null or default_duration_minutes between 1 and 600),
  official_source_url text check (official_source_url is null or official_source_url ~ '^https://'),
  sort_order smallint not null default 100,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.exam_types is 'Deneme catalog. wrong_penalty = how many wrong answers cancel one correct answer (0 = no penalty).';

alter table public.exam_types enable row level security;
create policy "Anyone can read exam types" on public.exam_types for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.exam_types from anon, authenticated;
grant select on public.exam_types to anon, authenticated;

insert into public.exam_types (
  code, short_name, name, category, description, color, wrong_penalty, penalty_editable,
  sections_editable, requires_title, uses_curriculum, grade_levels, sections, grade_presets,
  default_duration_minutes, official_source_url, sort_order
) values
  ('TYT', 'TYT', 'Temel Yeterlilik Testi', 'yks', 'YKS birinci oturum: Türkçe, sosyal bilimler, temel matematik ve fen bilimleri.', '#00A870', 4, false, false, false, true, '{}', '[]', '{}', 165, 'https://www.osym.gov.tr', 10),
  ('AYT', 'AYT', 'Alan Yeterlilik Testleri', 'yks', 'YKS ikinci oturum; dersler alanına göre gelir.', '#3B82F6', 4, false, false, false, true, '{}', '[]', '{}', 180, 'https://www.osym.gov.tr', 20),
  ('YDT', 'YDT', 'Yabancı Dil Testi', 'yks', 'YKS üçüncü oturum: 80 soruluk yabancı dil testi.', '#8B5CF6', 4, false, false, false, true, '{}', '[]', '{}', 120, 'https://www.osym.gov.tr', 30),
  ('KDS', 'KDS', 'Kazanım Değerlendirme Sınavı', 'okul', 'Okulda veya yayınevinde uygulanan kazanım denemeleri. Dersleri ve soru sayılarını kendi sınavına göre düzenleyebilirsin.', '#F59E0B', 4, true, true, false, false, '{5,6,7,8,9,10,11,12}', '[]',
    $json${
      "5": {"penalty": 3, "sections": [
        {"key": "turkce", "label": "Türkçe", "question_count": 15},
        {"key": "matematik", "label": "Matematik", "question_count": 15},
        {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 15},
        {"key": "sosyal_bilgiler", "label": "Sosyal Bilgiler", "question_count": 10},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10}]},
      "6": {"penalty": 3, "sections": [
        {"key": "turkce", "label": "Türkçe", "question_count": 15},
        {"key": "matematik", "label": "Matematik", "question_count": 15},
        {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 15},
        {"key": "sosyal_bilgiler", "label": "Sosyal Bilgiler", "question_count": 10},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10}]},
      "7": {"penalty": 3, "sections": [
        {"key": "turkce", "label": "Türkçe", "question_count": 15},
        {"key": "matematik", "label": "Matematik", "question_count": 15},
        {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 15},
        {"key": "sosyal_bilgiler", "label": "Sosyal Bilgiler", "question_count": 10},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10}]},
      "8": {"penalty": 3, "sections": [
        {"key": "turkce", "label": "Türkçe", "question_count": 15},
        {"key": "matematik", "label": "Matematik", "question_count": 15},
        {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 15},
        {"key": "inkilap_tarihi", "label": "T.C. İnkılap Tarihi ve Atatürkçülük", "question_count": 10},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10}]},
      "9": {"penalty": 4, "sections": [
        {"key": "turk_dili_edebiyati", "label": "Türk Dili ve Edebiyatı", "question_count": 20},
        {"key": "matematik", "label": "Matematik", "question_count": 20},
        {"key": "fizik", "label": "Fizik", "question_count": 10},
        {"key": "kimya", "label": "Kimya", "question_count": 10},
        {"key": "biyoloji", "label": "Biyoloji", "question_count": 10},
        {"key": "tarih", "label": "Tarih", "question_count": 10},
        {"key": "cografya", "label": "Coğrafya", "question_count": 10},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 5, "on": false},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10, "on": false}]},
      "10": {"penalty": 4, "sections": [
        {"key": "turk_dili_edebiyati", "label": "Türk Dili ve Edebiyatı", "question_count": 20},
        {"key": "matematik", "label": "Matematik", "question_count": 20},
        {"key": "fizik", "label": "Fizik", "question_count": 10},
        {"key": "kimya", "label": "Kimya", "question_count": 10},
        {"key": "biyoloji", "label": "Biyoloji", "question_count": 10},
        {"key": "tarih", "label": "Tarih", "question_count": 10},
        {"key": "cografya", "label": "Coğrafya", "question_count": 10},
        {"key": "felsefe", "label": "Felsefe", "question_count": 5, "on": false},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 5, "on": false},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10, "on": false}]},
      "11": {"penalty": 4, "sections": [
        {"key": "turk_dili_edebiyati", "label": "Türk Dili ve Edebiyatı", "question_count": 30},
        {"key": "matematik", "label": "Matematik", "question_count": 30},
        {"key": "fizik", "label": "Fizik", "question_count": 15, "on": ["sayisal"]},
        {"key": "kimya", "label": "Kimya", "question_count": 15, "on": ["sayisal"]},
        {"key": "biyoloji", "label": "Biyoloji", "question_count": 15, "on": ["sayisal"]},
        {"key": "tarih", "label": "Tarih", "question_count": 15, "on": ["esit_agirlik", "sozel"]},
        {"key": "cografya", "label": "Coğrafya", "question_count": 15, "on": ["esit_agirlik", "sozel"]},
        {"key": "felsefe", "label": "Felsefe", "question_count": 10, "on": ["sozel"]},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10, "on": false},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 20, "on": ["dil"]}]},
      "12": {"penalty": 4, "sections": [
        {"key": "turk_dili_edebiyati", "label": "Türk Dili ve Edebiyatı", "question_count": 30},
        {"key": "matematik", "label": "Matematik", "question_count": 30},
        {"key": "fizik", "label": "Fizik", "question_count": 15, "on": ["sayisal"]},
        {"key": "kimya", "label": "Kimya", "question_count": 15, "on": ["sayisal"]},
        {"key": "biyoloji", "label": "Biyoloji", "question_count": 15, "on": ["sayisal"]},
        {"key": "tarih", "label": "Tarih", "question_count": 15, "on": ["esit_agirlik", "sozel"]},
        {"key": "cografya", "label": "Coğrafya", "question_count": 15, "on": ["esit_agirlik", "sozel"]},
        {"key": "felsefe", "label": "Felsefe", "question_count": 10, "on": ["sozel"]},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10, "on": false},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 20, "on": ["dil"]}]}
    }$json$::jsonb, 90, null, 40),
  ('SDS', 'SDS', 'Sınıf Düzeyi Sınavı', 'okul', 'Sınıf düzeyine göre hazırlanan genel denemeler. Ders ve soru sayıları yayına göre değişebilir; sınavına göre düzenleyebilirsin.', '#EC4899', 4, true, true, false, false, '{5,6,7,8,9,10,11,12}', '[]',
    $json${
      "5": {"penalty": 3, "sections": [
        {"key": "turkce", "label": "Türkçe", "question_count": 20},
        {"key": "matematik", "label": "Matematik", "question_count": 20},
        {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 20},
        {"key": "sosyal_bilgiler", "label": "Sosyal Bilgiler", "question_count": 10},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10}]},
      "6": {"penalty": 3, "sections": [
        {"key": "turkce", "label": "Türkçe", "question_count": 20},
        {"key": "matematik", "label": "Matematik", "question_count": 20},
        {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 20},
        {"key": "sosyal_bilgiler", "label": "Sosyal Bilgiler", "question_count": 10},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10}]},
      "7": {"penalty": 3, "sections": [
        {"key": "turkce", "label": "Türkçe", "question_count": 20},
        {"key": "matematik", "label": "Matematik", "question_count": 20},
        {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 20},
        {"key": "sosyal_bilgiler", "label": "Sosyal Bilgiler", "question_count": 10},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10}]},
      "8": {"penalty": 3, "duration": 155, "sections": [
        {"key": "turkce", "label": "Türkçe", "question_count": 20},
        {"key": "inkilap_tarihi", "label": "T.C. İnkılap Tarihi ve Atatürkçülük", "question_count": 10},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10},
        {"key": "ingilizce", "label": "İngilizce", "question_count": 10},
        {"key": "matematik", "label": "Matematik", "question_count": 20},
        {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 20}]},
      "9": {"penalty": 4, "duration": 135, "sections": [
        {"key": "turk_dili_edebiyati", "label": "Türk Dili ve Edebiyatı", "question_count": 30},
        {"key": "tarih", "label": "Tarih", "question_count": 14},
        {"key": "cografya", "label": "Coğrafya", "question_count": 12},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 4},
        {"key": "matematik", "label": "Matematik", "question_count": 30},
        {"key": "fizik", "label": "Fizik", "question_count": 10},
        {"key": "kimya", "label": "Kimya", "question_count": 10},
        {"key": "biyoloji", "label": "Biyoloji", "question_count": 10}]},
      "10": {"penalty": 4, "duration": 135, "sections": [
        {"key": "turk_dili_edebiyati", "label": "Türk Dili ve Edebiyatı", "question_count": 30},
        {"key": "tarih", "label": "Tarih", "question_count": 11},
        {"key": "cografya", "label": "Coğrafya", "question_count": 10},
        {"key": "felsefe", "label": "Felsefe", "question_count": 5},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 4},
        {"key": "matematik", "label": "Matematik", "question_count": 30},
        {"key": "fizik", "label": "Fizik", "question_count": 10},
        {"key": "kimya", "label": "Kimya", "question_count": 10},
        {"key": "biyoloji", "label": "Biyoloji", "question_count": 10}]},
      "11": {"penalty": 4, "duration": 180, "sections": [
        {"key": "turk_dili_edebiyati", "label": "Türk Dili ve Edebiyatı", "question_count": 40},
        {"key": "matematik", "label": "Matematik", "question_count": 40},
        {"key": "fizik", "label": "Fizik", "question_count": 14, "on": ["sayisal"]},
        {"key": "kimya", "label": "Kimya", "question_count": 13, "on": ["sayisal"]},
        {"key": "biyoloji", "label": "Biyoloji", "question_count": 13, "on": ["sayisal"]},
        {"key": "tarih", "label": "Tarih", "question_count": 14, "on": ["esit_agirlik", "sozel"]},
        {"key": "cografya", "label": "Coğrafya", "question_count": 13, "on": ["esit_agirlik", "sozel"]},
        {"key": "felsefe", "label": "Felsefe", "question_count": 8, "on": ["sozel"]},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 5, "on": ["sozel"]}]},
      "12": {"penalty": 4, "duration": 165, "sections": [
        {"key": "turkce", "label": "Türkçe", "question_count": 40},
        {"key": "tarih", "label": "Tarih", "question_count": 5},
        {"key": "cografya", "label": "Coğrafya", "question_count": 5},
        {"key": "felsefe", "label": "Felsefe", "question_count": 5},
        {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 5},
        {"key": "matematik", "label": "Matematik", "question_count": 40},
        {"key": "fizik", "label": "Fizik", "question_count": 7},
        {"key": "kimya", "label": "Kimya", "question_count": 7},
        {"key": "biyoloji", "label": "Biyoloji", "question_count": 6}]}
    }$json$::jsonb, null, null, 50),
  ('LGS', 'LGS', 'Liselere Geçiş Sistemi Merkezî Sınavı', 'lgs', '8. sınıf merkezî sınav formatı: sözel ve sayısal oturum, 90 soru. 3 yanlış 1 doğruyu götürür.', '#06B6D4', 3, false, false, false, false, '{}',
    $json$[
      {"key": "turkce", "label": "Türkçe", "question_count": 20, "group": "Sözel oturum"},
      {"key": "inkilap_tarihi", "label": "T.C. İnkılap Tarihi ve Atatürkçülük", "question_count": 10, "group": "Sözel oturum"},
      {"key": "din_kulturu", "label": "Din Kültürü ve Ahlak Bilgisi", "question_count": 10, "group": "Sözel oturum"},
      {"key": "yabanci_dil", "label": "Yabancı Dil", "question_count": 10, "group": "Sözel oturum"},
      {"key": "matematik", "label": "Matematik", "question_count": 20, "group": "Sayısal oturum"},
      {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 20, "group": "Sayısal oturum"}
    ]$json$::jsonb, '{}', 155, 'https://www.meb.gov.tr', 60),
  ('KPSS_GYGK', 'KPSS GY-GK', 'KPSS Genel Yetenek - Genel Kültür', 'kpss', 'Lisans, ön lisans ve ortaöğretim düzeyleri için 120 soru, 130 dakika. 4 yanlış 1 doğruyu götürür.', '#EF4444', 4, false, false, false, false, '{}',
    $json$[
      {"key": "turkce", "label": "Türkçe", "question_count": 30, "group": "Genel Yetenek"},
      {"key": "matematik", "label": "Matematik", "question_count": 30, "group": "Genel Yetenek"},
      {"key": "tarih", "label": "Tarih", "question_count": 27, "group": "Genel Kültür"},
      {"key": "cografya", "label": "Coğrafya", "question_count": 18, "group": "Genel Kültür"},
      {"key": "vatandaslik", "label": "Vatandaşlık", "question_count": 9, "group": "Genel Kültür"},
      {"key": "guncel_bilgiler", "label": "Güncel Bilgiler", "question_count": 6, "group": "Genel Kültür"}
    ]$json$::jsonb, '{}', 130, 'https://www.osym.gov.tr', 70),
  ('ALES', 'ALES', 'Akademik Personel ve Lisansüstü Eğitimi Giriş Sınavı', 'lisansustu', 'Sayısal ve sözel testler: 100 soru, 150 dakika. 4 yanlış 1 doğruyu götürür.', '#6366F1', 4, false, false, false, false, '{}',
    $json$[
      {"key": "sayisal", "label": "Sayısal", "question_count": 50},
      {"key": "sozel", "label": "Sözel", "question_count": 50}
    ]$json$::jsonb, '{}', 150, 'https://www.osym.gov.tr', 80),
  ('DGS', 'DGS', 'Dikey Geçiş Sınavı', 'lisansustu', 'Ön lisanstan lisansa geçiş: sayısal ve sözel testler, 100 soru, 150 dakika.', '#14B8A6', 4, false, false, false, false, '{}',
    $json$[
      {"key": "sayisal", "label": "Sayısal", "question_count": 50},
      {"key": "sozel", "label": "Sözel", "question_count": 50}
    ]$json$::jsonb, '{}', 150, 'https://www.osym.gov.tr', 90),
  ('YDS', 'YDS', 'Yabancı Dil Bilgisi Seviye Tespit Sınavı', 'dil', '80 soru, 180 dakika. Yanlış cevaplar doğruları götürmez.', '#A855F7', 0, false, false, false, false, '{}',
    $json$[{"key": "yabanci_dil", "label": "Yabancı Dil", "question_count": 80}]$json$::jsonb, '{}', 180, 'https://www.osym.gov.tr', 100),
  ('YOKDIL', 'YÖKDİL', 'Yükseköğretim Kurumları Yabancı Dil Sınavı', 'dil', '80 soruluk akademik yabancı dil sınavı, 180 dakika. Yanlış cevaplar doğruları götürmez.', '#D946EF', 0, false, false, false, false, '{}',
    $json$[{"key": "yabanci_dil", "label": "Yabancı Dil", "question_count": 80}]$json$::jsonb, '{}', 180, 'https://www.osym.gov.tr', 110),
  ('MSU', 'MSÜ', 'Millî Savunma Üniversitesi Askerî Öğrenci Aday Belirleme Sınavı', 'msu', '120 soru, 165 dakika. 4 yanlış 1 doğruyu götürür.', '#64748B', 4, false, false, false, false, '{}',
    $json$[
      {"key": "turkce", "label": "Türkçe", "question_count": 40},
      {"key": "sosyal_bilimler", "label": "Sosyal Bilimler", "question_count": 20},
      {"key": "temel_matematik", "label": "Temel Matematik", "question_count": 40},
      {"key": "fen_bilimleri", "label": "Fen Bilimleri", "question_count": 20}
    ]$json$::jsonb, '{}', 165, 'https://www.osym.gov.tr', 120),
  ('DIGER', 'Diğer', 'Diğer / özel deneme', 'diger', 'Listede olmayan denemeler için bölümleri, soru sayılarını ve yanlış kuralını kendin belirle.', '#78716C', 4, true, true, true, false, '{}',
    $json$[{"key": "bolum_1", "label": "Bölüm 1", "question_count": 20}]$json$::jsonb, '{}', null, null, 200);

-- 2. Section key helper (mirrors lib/exams/catalog.js sectionKey) -------------
create or replace function public.exam_section_key(p_label text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(trim(both '_' from left(regexp_replace(
      translate(lower(translate(coalesce(p_label, ''), 'İIÇĞÖŞÜÂÎÛ', 'iıçğöşüâîû')), 'çğıöşüâîû', 'cgiosuaiu'),
      '[^a-z0-9]+', '_', 'g'), 40)), ''),
    'bolum'
  );
$$;

-- 3. denemeler: catalog FK and per-exam metadata ---------------------------
alter table public.denemeler drop constraint denemeler_sinav_turu_check;
alter table public.denemeler
  add constraint denemeler_sinav_turu_fkey foreign key (sinav_turu) references public.exam_types (code) on update cascade,
  add column grade_level smallint check (grade_level is null or grade_level between 1 and 12),
  add column wrong_penalty smallint not null default 4 check (wrong_penalty in (0, 3, 4)),
  add column exam_title text check (exam_title is null or char_length(exam_title) between 2 and 80);
create index denemeler_sinav_turu_idx on public.denemeler (sinav_turu);

-- 4. deneme_detaylari: self-describing sections and penalty-aware net -------
alter table public.deneme_detaylari
  alter column ders_id drop not null,
  add column section_key text check (section_key is null or section_key ~ '^[a-z0-9_]{1,40}$'),
  add column section_label text check (section_label is null or char_length(section_label) between 1 and 60),
  add column question_count smallint check (question_count is null or question_count between 1 and 200),
  add column wrong_penalty smallint not null default 4 check (wrong_penalty in (0, 3, 4));

-- Backfill YKS rows from the curriculum so every row carries its own section
-- name and question total. Blank answers are re-derived (total - correct - wrong),
-- matching what create_exam_with_details has always stored.
with resolved as (
  select detail.id, course.ad,
    case
      when course.question_count is not null and detail.dogru + detail.yanlis <= course.question_count then course.question_count
      else greatest(1, detail.dogru + detail.yanlis + detail.bos)
    end as total
  from public.deneme_detaylari as detail
  join public.dersler as course on course.id = detail.ders_id
)
update public.deneme_detaylari as detail
set section_key = public.exam_section_key(resolved.ad),
    section_label = left(resolved.ad, 60),
    question_count = resolved.total,
    bos = resolved.total - detail.dogru - detail.yanlis
from resolved
where resolved.id = detail.id;

alter table public.deneme_detaylari
  add constraint deneme_detaylari_section_identity check (
    ders_id is not null or (section_key is not null and section_label is not null and question_count is not null)
  ),
  add constraint deneme_detaylari_answer_total check (question_count is null or dogru + yanlis + bos = question_count),
  add constraint deneme_detaylari_exam_section_unique unique (deneme_id, section_key);

alter table public.deneme_detaylari alter column net set expression as (
  case when wrong_penalty = 0 then dogru::numeric else dogru::numeric - yanlis::numeric / wrong_penalty::numeric end
);

-- 5. Integrity on every write path (RPCs, direct client writes, seed scripts).
create or replace function public.normalize_exam_detail()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  course_name text;
  course_total smallint;
  exam_penalty smallint;
begin
  select exam.wrong_penalty into exam_penalty from public.denemeler as exam where exam.id = new.deneme_id;
  new.wrong_penalty := coalesce(exam_penalty, new.wrong_penalty, 4);

  if new.ders_id is not null then
    select course.ad, course.question_count into course_name, course_total
    from public.dersler as course where course.id = new.ders_id;
    new.section_key := coalesce(new.section_key, public.exam_section_key(course_name));
    new.section_label := coalesce(new.section_label, left(course_name, 60));
    new.question_count := coalesce(new.question_count, case
      when course_total is not null and new.dogru + new.yanlis <= course_total then course_total
      else greatest(1, new.dogru + new.yanlis + new.bos)
    end);
  end if;

  if new.question_count is not null then
    new.bos := greatest(0, new.question_count - new.dogru - new.yanlis);
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_exam_detail() from public, anon, authenticated;

create trigger normalize_exam_detail
before insert or update on public.deneme_detaylari
for each row execute function public.normalize_exam_detail();

create or replace function public.sync_exam_detail_penalty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.deneme_detaylari set wrong_penalty = new.wrong_penalty where deneme_id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_exam_detail_penalty() from public, anon, authenticated;

create trigger sync_exam_detail_penalty
after update of wrong_penalty on public.denemeler
for each row when (old.wrong_penalty is distinct from new.wrong_penalty)
execute function public.sync_exam_detail_penalty();

-- 6. Catalog-driven RPC for every non-YKS exam ------------------------------
create or replace function public.create_exam_result(
  p_exam_type text,
  p_publisher text,
  p_exam_date date,
  p_duration_minutes integer,
  p_sections jsonb,
  p_grade_level integer default null,
  p_wrong_penalty integer default null,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  exam_type public.exam_types%rowtype;
  penalty smallint;
  catalog jsonb;
  catalog_section jsonb;
  created_id uuid;
  item jsonb;
  item_key text;
  item_label text;
  item_total integer;
  correct_count integer;
  wrong_count integer;
  seen_keys text[] := '{}'::text[];
  question_sum integer := 0;
  clean_title text := nullif(trim(coalesce(p_title, '')), '');
begin
  if viewer is null or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Aktif oturum gerekli.';
  end if;
  if not public.can_insert_exam(viewer) then
    raise exception using errcode = '54000', message = 'Aylık deneme kayıt limitine ulaştın.';
  end if;

  select * into exam_type from public.exam_types as catalog_type
  where catalog_type.code = p_exam_type and catalog_type.is_active;
  if exam_type.code is null or exam_type.uses_curriculum then
    raise exception using errcode = '22023', message = 'Geçersiz sınav türü.';
  end if;
  if length(trim(coalesce(p_publisher, ''))) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Yayın veya kurum adı 2-120 karakter olmalıdır.';
  end if;
  if p_exam_date is null or p_exam_date > (now() at time zone 'Europe/Istanbul')::date
    or p_exam_date < (now() at time zone 'Europe/Istanbul')::date - 3650 then
    raise exception using errcode = '22023', message = 'Deneme tarihi bugün veya daha eski olmalıdır.';
  end if;
  if p_duration_minutes is not null and p_duration_minutes not between 1 and 600 then
    raise exception using errcode = '22023', message = 'Deneme süresi 1-600 dakika olmalıdır.';
  end if;

  if cardinality(exam_type.grade_levels) > 0 then
    if p_grade_level is null or not (p_grade_level::smallint = any (exam_type.grade_levels)) then
      raise exception using errcode = '22023', message = 'Sınıf düzeyini seçmelisin.';
    end if;
    catalog := coalesce(exam_type.grade_presets -> p_grade_level::text -> 'sections', '[]'::jsonb);
  elsif p_grade_level is not null then
    raise exception using errcode = '22023', message = 'Bu sınav türünde sınıf düzeyi seçilmez.';
  else
    catalog := exam_type.sections;
  end if;

  if exam_type.penalty_editable then
    penalty := coalesce(p_wrong_penalty, exam_type.wrong_penalty);
  elsif p_wrong_penalty is not null and p_wrong_penalty <> exam_type.wrong_penalty then
    raise exception using errcode = '22023', message = 'Bu sınav türünün yanlış kuralı değiştirilemez.';
  else
    penalty := exam_type.wrong_penalty;
  end if;
  if penalty not in (0, 3, 4) then
    raise exception using errcode = '22023', message = 'Yanlış kuralı geçersiz.';
  end if;

  if exam_type.requires_title and coalesce(char_length(clean_title), 0) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'Deneme adı 2-80 karakter olmalıdır.';
  end if;
  if clean_title is not null and char_length(clean_title) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'Deneme adı 2-80 karakter olmalıdır.';
  end if;

  if jsonb_typeof(p_sections) is distinct from 'array' or jsonb_array_length(p_sections) not between 1 and 30 then
    raise exception using errcode = '22023', message = 'En az bir ders sonucu girmelisin.';
  end if;

  insert into public.denemeler (user_id, sinav_turu, yayin, tarih, sure_dakika, grade_level, wrong_penalty, exam_title)
  values (viewer, exam_type.code, trim(p_publisher), p_exam_date, p_duration_minutes, p_grade_level, penalty, clean_title)
  returning id into created_id;

  for item in select value from jsonb_array_elements(p_sections) loop
    if jsonb_typeof(item) is distinct from 'object'
      or coalesce(item->>'key', '') !~ '^[a-z0-9_]{1,40}$'
      or coalesce(item->>'dogru', '') !~ '^\d{1,3}$'
      or coalesce(item->>'yanlis', '') !~ '^\d{1,3}$' then
      raise exception using errcode = '22023', message = 'Doğru ve yanlış sayıları negatif olmayan tam sayı olmalıdır.';
    end if;
    item_key := item->>'key';
    if item_key = any (seen_keys) then
      raise exception using errcode = '22023', message = 'Aynı ders bir denemeye iki kez eklenemez.';
    end if;

    if exam_type.sections_editable then
      item_label := trim(coalesce(item->>'label', ''));
      if char_length(item_label) not between 1 and 60 then
        raise exception using errcode = '22023', message = 'Ders adı 1-60 karakter olmalıdır.';
      end if;
      if coalesce(item->>'question_count', '') !~ '^\d{1,3}$' then
        raise exception using errcode = '22023', message = item_label || ' için soru sayısı geçersiz.';
      end if;
      item_total := (item->>'question_count')::integer;
      if item_total not between 1 and 200 then
        raise exception using errcode = '22023', message = item_label || ' için soru sayısı 1-200 arasında olmalıdır.';
      end if;
    else
      select section.value into catalog_section
      from jsonb_array_elements(catalog) as section
      where section.value->>'key' = item_key
      limit 1;
      if catalog_section is null then
        raise exception using errcode = '22023', message = 'Bu ders seçilen sınav türünde bulunmuyor.';
      end if;
      item_label := catalog_section->>'label';
      item_total := (catalog_section->>'question_count')::integer;
    end if;

    correct_count := (item->>'dogru')::integer;
    wrong_count := (item->>'yanlis')::integer;
    if correct_count + wrong_count > item_total then
      raise exception using errcode = '22023', message = item_label || ' için doğru ve yanlış toplamı soru sayısını aşıyor.';
    end if;
    question_sum := question_sum + item_total;
    if question_sum > 400 then
      raise exception using errcode = '22023', message = 'Bir denemede en fazla 400 soru olabilir.';
    end if;

    insert into public.deneme_detaylari (deneme_id, ders_id, section_key, section_label, question_count, dogru, yanlis, bos, wrong_penalty)
    values (created_id, null, item_key, item_label, item_total, correct_count, wrong_count, item_total - correct_count - wrong_count, penalty);
    seen_keys := array_append(seen_keys, item_key);
  end loop;

  return created_id;
end;
$$;

revoke all on function public.create_exam_result(text, text, date, integer, jsonb, integer, integer, text) from public, anon, authenticated;
grant execute on function public.create_exam_result(text, text, date, integer, jsonb, integer, integer, text) to authenticated;

-- 7. Exam notifications use the catalog name ("KPSS GY-GK denemen kaydedildi").
create or replace function public.notify_study_change()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  target_user uuid;
  notifications_are_enabled boolean;
  total_minutes integer;
  exam_label text;
begin
  target_user := new.user_id;

  select profile.notifications_enabled
    into notifications_are_enabled
  from public.profiles as profile
  where profile.id = target_user;

  if not coalesce(notifications_are_enabled, true) then
    return new;
  end if;

  if tg_table_name = 'gunluk_gorevler' then
    if tg_op = 'UPDATE' and new.tamamlandi and not coalesce(old.tamamlandi, false) then
      insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key, read_at)
      values (
        target_user,
        'success',
        'Görev tamamlandı',
        coalesce('“' || nullif(btrim(new.konu), '') || '” görevini bitirdin.', 'Planındaki bir görevi bitirdin.'),
        '/dashboard/gunluk-program',
        'task-completed-' || new.id::text,
        now()
      )
      on conflict (user_id, dedupe_key) do nothing;
    end if;
  elsif tg_table_name = 'denemeler' and tg_op = 'INSERT' then
    select coalesce(catalog_type.short_name, new.sinav_turu) into exam_label
    from public.exam_types as catalog_type
    where catalog_type.code = new.sinav_turu;
    insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key, read_at)
    values (
      target_user,
      'info',
      coalesce(exam_label, new.sinav_turu) || ' denemen kaydedildi',
      'Netlerin ve ders bazlı analizin hazır.',
      '/dashboard/deneme-analizi',
      'exam-created-' || new.id::text,
      now()
    )
    on conflict (user_id, dedupe_key) do nothing;
  elsif tg_table_name = 'calisma_suresi' and tg_op = 'INSERT' then
    select coalesce(sum(session.sure_dakika), 0)::integer
      into total_minutes
    from public.calisma_suresi as session
    where session.user_id = target_user and session.tarih = new.tarih;

    if total_minutes >= 30 then
      insert into public.notifications (user_id, kind, title, body, action_url, dedupe_key)
      values (
        target_user,
        'success',
        'Bugünkü seri hedefi tamam',
        total_minutes || ' dakika çalıştın ve serini korudun. Yarın da en az 30 dakika çalış.',
        '/dashboard/istatistikler',
        'daily-streak-' || new.tarih::text
      )
      on conflict (user_id, dedupe_key) do nothing;
    end if;
  end if;

  return new;
end;
$function$;
