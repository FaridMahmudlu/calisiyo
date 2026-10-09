-- Backfill official question counts so deneme (mock exam) entries can be saved
-- for every curriculum year. The 2028 curriculum seed inserted rows with
-- question_count = null, and the 2027 update skipped AYT Tarih/Coğrafya/Felsefe.
-- create_exam_with_details rejects courses without a question count, which made
-- deneme saving impossible for YKS 2028 users and for AYT social courses in 2027.

update public.dersler
set question_count = case
  when sinav_turu = 'TYT' and ad in ('Türkçe', 'Matematik') then 40
  when sinav_turu = 'TYT' and ad in ('Fizik', 'Kimya') then 7
  when sinav_turu = 'TYT' and ad = 'Biyoloji' then 6
  when sinav_turu = 'TYT' and ad in ('Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü') then 5
  when sinav_turu = 'AYT' and ad = 'Matematik' then 40
  when sinav_turu = 'AYT' and ad = 'Edebiyat' then 24
  when sinav_turu = 'AYT' and ad = 'Fizik' then 14
  when sinav_turu = 'AYT' and ad in ('Kimya', 'Biyoloji') then 13
  -- AYT Tarih/Coğrafya rows cover Sosyal-1 and Sosyal-2 sections combined
  -- (Tarih 10+11, Coğrafya 6+11); sözel students answer both sections.
  when sinav_turu = 'AYT' and ad = 'Tarih' then 21
  when sinav_turu = 'AYT' and ad = 'Coğrafya' then 17
  when sinav_turu = 'AYT' and ad = 'Felsefe' then 12
  when sinav_turu = 'YDT' then 80
  else question_count
end
where question_count is null;

-- 2028 YDT catalog parity: Almanca and Fransızca rows only existed for 2027.
insert into public.dersler (
  ad, sinav_turu, alan, renk, ikon, sira, curriculum_year,
  official_source_url, official_source_label, question_count
)
values
  ('Almanca', 'YDT', array['dil']::text[], '#F59E0B', '🇩🇪', 19, 2028,
   'https://tymm.meb.gov.tr/ogretim-programlari/', 'MEB Türkiye Yüzyılı Maarif Modeli', 80),
  ('Fransızca', 'YDT', array['dil']::text[], '#EF4444', '🇫🇷', 20, 2028,
   'https://tymm.meb.gov.tr/ogretim-programlari/', 'MEB Türkiye Yüzyılı Maarif Modeli', 80)
on conflict (ad, sinav_turu, curriculum_year) do update
  set alan = excluded.alan,
      renk = excluded.renk,
      ikon = excluded.ikon,
      sira = excluded.sira,
      question_count = excluded.question_count;
