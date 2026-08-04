-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  alan_secimi TEXT NOT NULL CHECK (alan_secimi IN ('sayisal', 'esit_agirlik', 'sozel', 'dil')),
  avatar_url TEXT,
  theme TEXT DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Dersler table (system courses)
CREATE TABLE dersler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad TEXT NOT NULL,
  sinav_turu TEXT NOT NULL CHECK (sinav_turu IN ('TYT', 'AYT', 'YDT')),
  alan TEXT[] NOT NULL,
  renk TEXT,
  ikon TEXT,
  sira INTEGER DEFAULT 0
);

-- 3. Konular table (topics per course)
CREATE TABLE konular (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ders_id UUID REFERENCES dersler(id) ON DELETE CASCADE,
  ad TEXT NOT NULL,
  sira INTEGER DEFAULT 0
);

-- 4. Konu Takibi (user topic tracking)
CREATE TABLE konu_takibi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  konu_id UUID REFERENCES konular(id) ON DELETE CASCADE,
  durum TEXT NOT NULL DEFAULT 'baslanmadi' CHECK (durum IN ('baslanmadi', 'devam_ediyor', 'tamamlandi')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, konu_id)
);

-- 5. Kaynaklar Sistem (system resources)
CREATE TABLE kaynaklar_sistem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad TEXT NOT NULL,
  yayin TEXT NOT NULL,
  ders_id UUID REFERENCES dersler(id),
  sinav_turu TEXT NOT NULL CHECK (sinav_turu IN ('TYT', 'AYT', 'YDT')),
  kitap_turu TEXT,
  kapak_url TEXT
);

-- 6. Kaynaklarim (user's resources)
CREATE TABLE kaynaklarim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  kaynak_sistem_id UUID REFERENCES kaynaklar_sistem(id),
  custom_ad TEXT,
  custom_yayin TEXT,
  custom_ders_id UUID REFERENCES dersler(id),
  custom_sinav_turu TEXT CHECK (custom_sinav_turu IN ('TYT', 'AYT', 'YDT')),
  custom_kitap_turu TEXT,
  custom_kapak_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Gunluk Gorevler (daily tasks)
CREATE TABLE gunluk_gorevler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tarih DATE NOT NULL,
  baslangic_saat TIME NOT NULL,
  bitis_saat TIME NOT NULL,
  ders_id UUID REFERENCES dersler(id),
  kaynak_id UUID REFERENCES kaynaklarim(id),
  konu TEXT,
  soru_sayisi INTEGER,
  sayfa_araligi TEXT,
  tamamlandi BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Denemeler (mock exams)
CREATE TABLE denemeler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sinav_turu TEXT NOT NULL CHECK (sinav_turu IN ('TYT', 'AYT', 'YDT')),
  yayin TEXT NOT NULL,
  tarih DATE NOT NULL,
  sure_dakika INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Deneme Detaylari (exam details per subject)
CREATE TABLE deneme_detaylari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deneme_id UUID REFERENCES denemeler(id) ON DELETE CASCADE,
  ders_id UUID REFERENCES dersler(id),
  dogru INTEGER NOT NULL DEFAULT 0,
  yanlis INTEGER NOT NULL DEFAULT 0,
  bos INTEGER NOT NULL DEFAULT 0,
  net DECIMAL(5,2) GENERATED ALWAYS AS (dogru - (yanlis::decimal / 4)) STORED
);

-- 10. Yapamadiklari (unsolved questions)
CREATE TABLE yapamadiklari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ders_id UUID REFERENCES dersler(id),
  sinav_turu TEXT NOT NULL CHECK (sinav_turu IN ('TYT', 'AYT', 'YDT')),
  kaynak_id UUID REFERENCES kaynaklarim(id),
  konu TEXT,
  sayfa INTEGER,
  soru_no TEXT,
  foto_url TEXT,
  cozuldu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Tekrarlar (review system)
CREATE TABLE tekrarlar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ders_id UUID REFERENCES dersler(id),
  sinav_turu TEXT NOT NULL CHECK (sinav_turu IN ('TYT', 'AYT', 'YDT')),
  konu TEXT NOT NULL,
  kaynak TEXT,
  tekrar_tarihi DATE NOT NULL,
  tekrar_saati TIME,
  tamamlandi BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Calisma Suresi (study time logs)
CREATE TABLE calisma_suresi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ders_id UUID REFERENCES dersler(id),
  tarih DATE NOT NULL DEFAULT CURRENT_DATE,
  sure_dakika INTEGER NOT NULL,
  soru_sayisi INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Notlar (notebook)
CREATE TABLE notlar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  klasor TEXT NOT NULL,
  baslik TEXT NOT NULL,
  icerik TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Pomodoro Kayitlari (pomodoro logs)
CREATE TABLE pomodoro_kayitlari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  calisma_suresi INTEGER NOT NULL,
  mola_suresi INTEGER NOT NULL,
  ders_id UUID REFERENCES dersler(id),
  tarih TIMESTAMPTZ DEFAULT now()
);;
