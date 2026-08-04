-- TYT Dersler
INSERT INTO dersler (ad, sinav_turu, alan, renk, ikon, sira) VALUES
('Türkçe', 'TYT', ARRAY['sayisal','esit_agirlik','sozel','dil'], '#10B981', '📖', 1),
('Matematik', 'TYT', ARRAY['sayisal','esit_agirlik','sozel','dil'], '#3B82F6', '📐', 2),
('Fizik', 'TYT', ARRAY['sayisal','esit_agirlik'], '#8B5CF6', '⚡', 3),
('Kimya', 'TYT', ARRAY['sayisal','esit_agirlik'], '#F59E0B', '🧪', 4),
('Biyoloji', 'TYT', ARRAY['sayisal','esit_agirlik'], '#EF4444', '🧬', 5),
('Tarih', 'TYT', ARRAY['sayisal','esit_agirlik','sozel','dil'], '#6366F1', '📜', 6),
('Coğrafya', 'TYT', ARRAY['sayisal','esit_agirlik','sozel','dil'], '#14B8A6', '🌍', 7),
('Felsefe', 'TYT', ARRAY['sayisal','esit_agirlik','sozel','dil'], '#EC4899', '🤔', 8),
('Din Kültürü', 'TYT', ARRAY['sayisal','esit_agirlik','sozel','dil'], '#F97316', '📿', 9),

-- AYT Dersler
('Matematik', 'AYT', ARRAY['sayisal','esit_agirlik'], '#3B82F6', '📊', 10),
('Fizik', 'AYT', ARRAY['sayisal'], '#8B5CF6', '🔬', 11),
('Kimya', 'AYT', ARRAY['sayisal'], '#F59E0B', '⚗️', 12),
('Biyoloji', 'AYT', ARRAY['sayisal'], '#EF4444', '🔭', 13),
('Edebiyat', 'AYT', ARRAY['esit_agirlik','sozel'], '#EC4899', '✍️', 14),
('Tarih', 'AYT', ARRAY['esit_agirlik','sozel'], '#6366F1', '🏛️', 15),
('Coğrafya', 'AYT', ARRAY['esit_agirlik','sozel'], '#14B8A6', '🗺️', 16),
('Felsefe', 'AYT', ARRAY['sozel'], '#EC4899', '💡', 17),

-- YDT
('İngilizce', 'YDT', ARRAY['dil'], '#3B82F6', '🌐', 18),
('Almanca', 'YDT', ARRAY['dil'], '#F59E0B', '🇩🇪', 19),
('Fransızca', 'YDT', ARRAY['dil'], '#EF4444', '🇫🇷', 20);;
