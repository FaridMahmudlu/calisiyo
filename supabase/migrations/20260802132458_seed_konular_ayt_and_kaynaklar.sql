-- AYT Matematik konulari
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Trigonometri', 1), ('Logaritma', 2), ('Diziler', 3),
  ('Limit', 4), ('Türev', 5), ('İntegral', 6),
  ('Analitik Geometri', 7), ('Karmasık Sayılar', 8)
) AS k(ad, sira)
WHERE d.ad = 'Matematik' AND d.sinav_turu = 'AYT';

-- AYT Fizik konulari
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Vektörler', 1), ('Kuvvet-Denge-Tork', 2), ('Düzgün Çembersel Hareket', 3),
  ('Basit Harmonik Hareket', 4), ('Dalga Mekaniği', 5), ('Elektrik Alanı', 6),
  ('Mıknatıslık ve Elektromanyetik İndüksiyon', 7), ('Modern Fizik', 8),
  ('Atom Fiziği', 9), ('Nükleer Fizik', 10)
) AS k(ad, sira)
WHERE d.ad = 'Fizik' AND d.sinav_turu = 'AYT';

-- AYT Kimya konulari
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Gazlar', 1), ('Sıvı Çözümler', 2), ('Kimyasal Tepkimelerde Enerji', 3),
  ('Kimyasal Tepkimelerde Hız', 4), ('Kimyasal Denge', 5),
  ('Çözünürlük Dengesi', 6), ('Asit-Baz Dengesi', 7),
  ('Elektrokimya', 8), ('Organik Kimya', 9)
) AS k(ad, sira)
WHERE d.ad = 'Kimya' AND d.sinav_turu = 'AYT';

-- AYT Biyoloji konulari
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Sinir Sistemi', 1), ('Endokrin Sistem', 2), ('Duyu Organları', 3),
  ('Destek ve Hareket', 4), ('Sindirim Sistemi', 5), ('Dolaşım Sistemi', 6),
  ('Solunum Sistemi', 7), ('Boşaltım Sistemi', 8), ('Homöostazi', 9),
  ('Protein Sentezi', 10), ('Genetik Mühendislik', 11), ('Biyoteknoloji', 12),
  ('Canlı Grupları', 13), ('Bitkilerde Fizyoloji', 14), ('Hayvan Fizyolojisi', 15)
) AS k(ad, sira)
WHERE d.ad = 'Biyoloji' AND d.sinav_turu = 'AYT';

-- Sistem kaynaklari (popular books)
INSERT INTO kaynaklar_sistem (ad, yayin, ders_id, sinav_turu, kitap_turu) VALUES
('3D TYT Matematik', '3D', (SELECT id FROM dersler WHERE ad='Matematik' AND sinav_turu='TYT'), 'TYT', 'soru_bankasi'),
('Bilgi Sarmal TYT Matematik', 'Bilgi Sarmal', (SELECT id FROM dersler WHERE ad='Matematik' AND sinav_turu='TYT'), 'TYT', 'soru_bankasi'),
('345 TYT Matematik', '345', (SELECT id FROM dersler WHERE ad='Matematik' AND sinav_turu='TYT'), 'TYT', 'soru_bankasi'),
('Orijinal TYT Matematik', 'Orijinal', (SELECT id FROM dersler WHERE ad='Matematik' AND sinav_turu='TYT'), 'TYT', 'soru_bankasi'),
('Bilgi Sarmal AYT Matematik', 'Bilgi Sarmal', (SELECT id FROM dersler WHERE ad='Matematik' AND sinav_turu='AYT'), 'AYT', 'soru_bankasi'),
('3D AYT Matematik', '3D', (SELECT id FROM dersler WHERE ad='Matematik' AND sinav_turu='AYT'), 'AYT', 'soru_bankasi'),
('Bilgi Sarmal TYT Paragraf', 'Bilgi Sarmal', (SELECT id FROM dersler WHERE ad='Türkçe' AND sinav_turu='TYT'), 'TYT', 'soru_bankasi'),
('Limit AYT Fizik', 'Limit', (SELECT id FROM dersler WHERE ad='Fizik' AND sinav_turu='AYT'), 'AYT', 'soru_bankasi'),
('Apotemi Trigonometri', 'Apotemi', (SELECT id FROM dersler WHERE ad='Matematik' AND sinav_turu='AYT'), 'AYT', 'soru_bankasi'),
('3D TYT Fizik', '3D', (SELECT id FROM dersler WHERE ad='Fizik' AND sinav_turu='TYT'), 'TYT', 'soru_bankasi'),
('3D TYT Kimya', '3D', (SELECT id FROM dersler WHERE ad='Kimya' AND sinav_turu='TYT'), 'TYT', 'soru_bankasi'),
('3D TYT Biyoloji', '3D', (SELECT id FROM dersler WHERE ad='Biyoloji' AND sinav_turu='TYT'), 'TYT', 'soru_bankasi'),
('3D TYT Türkçe', '3D', (SELECT id FROM dersler WHERE ad='Türkçe' AND sinav_turu='TYT'), 'TYT', 'soru_bankasi');;
