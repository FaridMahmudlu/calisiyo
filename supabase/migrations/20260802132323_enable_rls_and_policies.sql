-- Enable RLS on all user-data tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE konu_takibi ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaynaklarim ENABLE ROW LEVEL SECURITY;
ALTER TABLE gunluk_gorevler ENABLE ROW LEVEL SECURITY;
ALTER TABLE denemeler ENABLE ROW LEVEL SECURITY;
ALTER TABLE deneme_detaylari ENABLE ROW LEVEL SECURITY;
ALTER TABLE yapamadiklari ENABLE ROW LEVEL SECURITY;
ALTER TABLE tekrarlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE calisma_suresi ENABLE ROW LEVEL SECURITY;
ALTER TABLE notlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_kayitlari ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update only their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Dersler & Konular: readable by everyone (system data)
ALTER TABLE dersler ENABLE ROW LEVEL SECURITY;
ALTER TABLE konular ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaynaklar_sistem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dersler" ON dersler FOR SELECT USING (true);
CREATE POLICY "Anyone can read konular" ON konular FOR SELECT USING (true);
CREATE POLICY "Anyone can read kaynaklar_sistem" ON kaynaklar_sistem FOR SELECT USING (true);

-- Generic user-data policies (own data only)
CREATE POLICY "Users own konu_takibi" ON konu_takibi FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own kaynaklarim" ON kaynaklarim FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own gunluk_gorevler" ON gunluk_gorevler FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own denemeler" ON denemeler FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own deneme_detaylari" ON deneme_detaylari FOR ALL USING (
  EXISTS (SELECT 1 FROM denemeler WHERE denemeler.id = deneme_detaylari.deneme_id AND denemeler.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM denemeler WHERE denemeler.id = deneme_detaylari.deneme_id AND denemeler.user_id = auth.uid())
);
CREATE POLICY "Users own yapamadiklari" ON yapamadiklari FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own tekrarlar" ON tekrarlar FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own calisma_suresi" ON calisma_suresi FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own notlar" ON notlar FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own pomodoro" ON pomodoro_kayitlari FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);;
