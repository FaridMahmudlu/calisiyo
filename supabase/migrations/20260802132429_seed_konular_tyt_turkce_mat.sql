-- TYT Türkçe konuları
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Sözcükte Anlam', 1), ('Cümlede Anlam', 2), ('Paragraf', 3),
  ('Ses Bilgisi', 4), ('Yapım Ekleri', 5), ('Çekim Ekleri', 6),
  ('Sözcük Türleri', 7), ('Cümle Türleri', 8), ('Anlatım Bozuklukları', 9),
  ('Noktalama İşaretleri', 10), ('Yazım Kuralları', 11), ('Fiilde Çatı', 12),
  ('Sözcükte Yapı', 13), ('Cümlede Anlam İlişkileri', 14), ('Paragrafta Yapı', 15)
) AS k(ad, sira)
WHERE d.ad = 'Türkçe' AND d.sinav_turu = 'TYT';

-- TYT Matematik konuları
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Temel Kavramlar', 1), ('Sayı Basamakları', 2), ('Bölme - Bölünebilme', 3),
  ('EBOB - EKOK', 4), ('Rasyonel Sayılar', 5), ('Ondalık Sayılar', 6),
  ('Basit Eşitsizlikler', 7), ('Mutlak Değer', 8), ('Üslü Sayılar', 9),
  ('Köklü Sayılar', 10), ('Çarpanlara Ayırma', 11), ('Oran - Orantı', 12),
  ('Problemler', 13), ('Kümeler', 14), ('Fonksiyonlar', 15),
  ('Polinomlar', 16), ('İkinci Dereceden Denklemler', 17),
  ('Permütasyon - Kombinasyon', 18), ('Olasılık', 19), ('İstatistik', 20),
  ('Veri Yorumlama', 21)
) AS k(ad, sira)
WHERE d.ad = 'Matematik' AND d.sinav_turu = 'TYT';

-- TYT Fizik konuları
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Fizik Bilimine Giriş', 1), ('Madde ve Özellikleri', 2), ('Kuvvet', 3),
  ('Hareket', 4), ('Enerji', 5), ('Isı - Sıcaklık', 6),
  ('Elektrostatik', 7), ('Elektrik Akımı', 8), ('Manyetizma', 9),
  ('Basınç', 10), ('Dalgalar', 11), ('Optik', 12)
) AS k(ad, sira)
WHERE d.ad = 'Fizik' AND d.sinav_turu = 'TYT';

-- TYT Kimya konuları
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Kimya Bilimi', 1), ('Atom ve Periyodik Sistem', 2), ('Kimyasal Türler', 3),
  ('Mol Kavramı', 4), ('Kimyasal Tepkimeler', 5), ('Asitler ve Bazlar', 6),
  ('Karışımlar', 7), ('Endüstride Kimya', 8), ('Maddenin Halleri', 9)
) AS k(ad, sira)
WHERE d.ad = 'Kimya' AND d.sinav_turu = 'TYT';

-- TYT Biyoloji konuları
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Canlıların Ortak Özellikleri', 1), ('Hücre', 2), ('Canlıların Sınıflandırılması', 3),
  ('Mitoz - Mayoz', 4), ('Kalıtım', 5), ('Ekosistem', 6),
  ('Çevre Sorunları', 7), ('Canlılarda Enerji', 8), ('Bitki Biyolojisi', 9)
) AS k(ad, sira)
WHERE d.ad = 'Biyoloji' AND d.sinav_turu = 'TYT';

-- TYT Tarih konuları
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Tarih Bilimi', 1), ('İlk Çağ Uygarlıkları', 2), ('İslam Tarihi', 3),
  ('Türk İslam Devletleri', 4), ('Osmanlı Kuruluş', 5), ('Osmanlı Yükseliş', 6),
  ('Osmanlı Duraklama', 7), ('Osmanlı Gerileme-Çöküş', 8),
  ('Kurtuluş Savaşı', 9), ('Atatürk İlkeleri', 10)
) AS k(ad, sira)
WHERE d.ad = 'Tarih' AND d.sinav_turu = 'TYT';

-- TYT Coğrafya konuları
INSERT INTO konular (ders_id, ad, sira)
SELECT d.id, k.ad, k.sira
FROM dersler d,
(VALUES
  ('Doğa ve İnsan', 1), ('Harita Bilgisi', 2), ('İklim Bilgisi', 3),
  ('İç Kuvvetler', 4), ('Dış Kuvvetler', 5), ('Nüfus', 6),
  ('Göç', 7), ('Yerleşme', 8), ('Türkiye Coğrafyası', 9)
) AS k(ad, sira)
WHERE d.ad = 'Coğrafya' AND d.sinav_turu = 'TYT';;
