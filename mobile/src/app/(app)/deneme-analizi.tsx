import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, BarChart2, CalendarDays, Clock3, Layers, Plus, Target, Trash2, TrendingUp } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getExamTabs } from '@shared/constants/alanlar';
import {
  EXAM_COLUMNS, EXAM_TYPE_COLUMNS, examTypeMap, examsThisMonth, formatDelta, formatNet, formatRate,
  normalizeExam, overviewSeries, penaltyLabel, sortExamTypes, subjectBreakdown, summarizeExams, typeSummaries,
} from '@shared/exams/catalog';
import { formatDate, formatShortDate, todayStr } from '@shared/utils/date';
import { AreaChart, MultiLineChart } from '@/components/charts';
import { Button, Card, Chip, Dialog, EmptyState, ErrorState, IconButton, Screen, SkeletonCards, Text, useToast } from '@/components/ui';
import { ExamEntrySheet, type ExamCourse, type ExamPayload, type ExamTypeRow } from '@/features/exams/ExamEntrySheet';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { supabase } from '@/lib/supabase';
import { useAccount } from '@/providers/AccountProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Exam = ReturnType<typeof normalizeExam>;
const REALTIME_TABLES = ['denemeler'];
const OVERVIEW = 'overview';

function Delta({ value }: { value: number }) {
  const { colors } = useTheme();
  const up = value > 0;
  const tone = !value ? colors.textMuted : up ? colors.primaryPressed : colors.danger;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <View style={[styles.delta, { backgroundColor: !value ? colors.surfaceSunken : up ? colors.primarySoft : colors.dangerSoft }]}>
      {value ? <Icon size={13} color={tone} /> : null}
      <Text variant="captionStrong" color={tone} style={{ fontSize: 12 }}>{value ? formatDelta(value) : '±0'}</Text>
    </View>
  );
}

function Kpi({ label, value, hint, children }: { label: string; value: string | number; hint?: string; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.kpi, { backgroundColor: colors.surface, borderColor: colors.border, borderBottomColor: colors.borderStrong }]}>
      <Text variant="captionStrong" color="textMuted" numberOfLines={1}>{label}</Text>
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {children ?? (hint ? <Text variant="caption" color="textSubtle" numberOfLines={1}>{hint}</Text> : null)}
    </View>
  );
}

function RateBar({ value, color }: { value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceSunken, overflow: 'hidden', flex: 1 }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: radius.full, backgroundColor: color }} />
    </View>
  );
}

function ExamCard({ exam, onDelete, showType }: { exam: Exam; onDelete: (exam: Exam) => void; showType?: boolean }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.examHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          {showType ? <View style={[styles.typeBadge, { backgroundColor: `${exam.color}22` }]}><Text variant="captionStrong" style={{ fontSize: 12 }}>{exam.shortName}</Text></View> : null}
          <Text variant="subheading" numberOfLines={2}>{exam.title || exam.publisher}</Text>
          <View style={styles.meta}>
            <CalendarDays size={13} color={colors.textMuted} /><Text variant="caption" color="textMuted">{formatDate(exam.date)}</Text>
            {exam.duration ? <><Clock3 size={13} color={colors.textMuted} /><Text variant="caption" color="textMuted">{exam.duration} dk</Text></> : null}
            {exam.grade ? <Text variant="caption" color="textMuted">· {exam.grade}. sınıf</Text> : null}
          </View>
          {exam.title ? <Text variant="caption" color="textSubtle" numberOfLines={1}>{exam.publisher}</Text> : null}
        </View>
        <View style={[styles.total, { backgroundColor: `${exam.color}18` }]}>
          <Text variant="caption" color="textMuted">Net</Text>
          <Text variant="title">{formatNet(exam.net)}</Text>
          <Text variant="caption" color="textMuted">{formatRate(exam.rate)}</Text>
        </View>
      </View>
      {exam.sections.map((section) => (
        <View key={section.id} style={[styles.detail, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <Text variant="captionStrong" numberOfLines={1} style={{ flex: 1 }}>{section.label}</Text>
          <Text variant="captionStrong" color="primaryPressed">{section.correct}D</Text>
          <Text variant="captionStrong" color="danger">{section.wrong}Y</Text>
          <Text variant="captionStrong" color="textMuted">{section.blank}B</Text>
          <Text variant="captionStrong" style={{ minWidth: 54, textAlign: 'right' }}>{formatNet(section.net)}<Text variant="caption" color="textSubtle">/{section.questionCount}</Text></Text>
        </View>
      ))}
      <View style={styles.cardFooter}>
        <Text variant="caption" color="textSubtle" style={{ flex: 1 }}>{penaltyLabel(exam.penalty)}</Text>
        <Button title="Sil" icon={Trash2} variant="ghost" size="sm" onPress={() => onDelete(exam)} />
      </View>
    </Card>
  );
}

export default function ExamAnalysisScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { profile } = useAccount();
  const userId = profile?.id;
  const allowedYks = useMemo(() => getExamTabs(profile?.alan_secimi || 'sayisal'), [profile?.alan_secimi]);
  const [tab, setTab] = useState<string | null>(null);
  const [entry, setEntry] = useState<{ code: string | null; key: number } | null>(null);
  const [subjectKey, setSubjectKey] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['exams-v2', userId, profile?.yks_year, profile?.alan_secimi],
    enabled: !!profile,
    queryFn: async () => {
      const [types, exams, courses] = await Promise.all([
        supabase.from('exam_types').select(EXAM_TYPE_COLUMNS).order('sort_order'),
        supabase.from('denemeler').select(EXAM_COLUMNS).eq('user_id', userId!).order('tarih', { ascending: false }).limit(500),
        supabase.from('dersler').select('id,ad,renk,ikon,sira,question_count,sinav_turu').in('sinav_turu', getExamTabs(profile!.alan_secimi))
          .eq('curriculum_year', Number(profile!.yks_year || 2027)).contains('alan', [profile!.alan_secimi]).order('sira'),
      ]);
      if (types.error || exams.error || courses.error) throw new Error('Deneme verileri yüklenemedi. Lütfen tekrar dene.');
      return { types: sortExamTypes((types.data || []) as ExamTypeRow[]) as ExamTypeRow[], rows: exams.data || [], courses: (courses.data || []) as ExamCourse[] };
    },
  });
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId, onChange: query.refetch });

  const types = useMemo(() => query.data?.types || [], [query.data?.types]);
  const typesByCode = useMemo(() => examTypeMap(types) as Record<string, ExamTypeRow>, [types]);
  const exams = useMemo<Exam[]>(() => (query.data?.rows || []).map((row) => normalizeExam(row, typesByCode)), [query.data?.rows, typesByCode]);
  const summaries = useMemo(() => typeSummaries(exams, typesByCode), [exams, typesByCode]);
  const tabCodes = useMemo(() => [...new Set([...allowedYks, ...summaries.map((item) => item.code)])]
    .sort((a, b) => (typesByCode[a]?.sort_order ?? 100) - (typesByCode[b]?.sort_order ?? 100)), [allowedYks, summaries, typesByCode]);
  const fallback = summaries.length > 1 ? OVERVIEW : summaries[0]?.code || allowedYks[0];
  const active = tab && [OVERVIEW, ...tabCodes].includes(tab) ? tab : fallback;
  const typeExams = useMemo(() => exams.filter((exam) => exam.code === active), [exams, active]);
  const summary = useMemo(() => summarizeExams(active === OVERVIEW ? exams : typeExams), [active, exams, typeExams]);
  const subjects = useMemo(() => subjectBreakdown(typeExams), [typeExams]);
  const activeSubject = subjects.find((subject) => subject.key === subjectKey) || subjects[0];
  const weakest = [...subjects].sort((a, b) => a.averageRate - b.averageRate).slice(0, Math.min(2, Math.max(0, subjects.length - 1))).map((subject) => subject.key);
  const previousExams = useMemo(() => [...exams].sort((a, b) => String(b.date).localeCompare(String(a.date))), [exams]);
  const ordered = (list: Exam[]) => [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const activeType = active === OVERVIEW ? undefined : typesByCode[active];
  const color = activeType?.color || colors.primary;

  const openEntry = (code: string | null) => setEntry({ code: code && typesByCode[code] ? code : null, key: Date.now() });
  const submit = async ({ rpc, args }: ExamPayload) => {
    const { error } = await supabase.rpc(rpc, args);
    if (error) return { error: error.code === '54000' ? 'Bu ayki deneme kayıt limitine ulaştın. Paketini yükselterek daha fazla deneme kaydedebilirsin.' : error.message || 'Deneme kaydedilemedi.' };
    setEntry(null);
    setTab(String(args.p_exam_type));
    toast.success(`${typesByCode[String(args.p_exam_type)]?.short_name || 'Deneme'} sonucun kaydedildi`);
    query.refetch();
    return {};
  };
  const remove = (exam: Exam) => Dialog.alert('Denemeyi sil', `“${exam.title || exam.publisher}” denemesi ve tüm ders sonuçları silinsin mi?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('denemeler').delete().eq('id', exam.id).eq('user_id', userId!);
      if (error) toast.error(`Deneme silinemedi: ${error.message}`);
      query.refetch();
    } },
  ], { icon: Trash2 });

  const overviewRows = useMemo(() => overviewSeries(exams, formatShortDate).map((row: Record<string, unknown>) => ({
    label: String(row.label), caption: String(row.label), values: { [String(row.code)]: Number(row[String(row.code)]) },
  })), [exams]);

  return (
    <Screen onRefresh={query.refetch}>
      <Stack.Screen options={{ headerRight: () => <IconButton icon={Plus} label="Deneme ekle" tone="primary" onPress={() => openEntry(active === OVERVIEW ? null : active)} /> }} />
      <Text variant="body" color="textMuted">YKS, KDS, SDS, LGS, KPSS ve diğer denemelerini kaydet; netlerini hem birlikte hem de sınav ve ders bazında ayrı ayrı izle.</Text>

      {query.isLoading ? <View style={{ marginTop: space.lg }}><SkeletonCards /></View>
        : query.isError ? <View style={{ marginTop: space.lg }}><ErrorState message={(query.error as Error).message} onRetry={query.refetch} /></View>
          : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.lg, marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
                <Chip label="Genel bakış" icon={Layers} active={active === OVERVIEW} onPress={() => setTab(OVERVIEW)} />
                {tabCodes.map((code) => {
                  const count = summaries.find((item) => item.code === code)?.count || 0;
                  return <Chip key={code} label={`${typesByCode[code]?.short_name || code}${count ? ` · ${count}` : ''}`} active={active === code} tone={typesByCode[code]?.color} onPress={() => { setTab(code); setSubjectKey(null); }} />;
                })}
                <Chip label="Başka sınav" icon={Plus} onPress={() => openEntry(null)} />
              </ScrollView>

              {exams.length === 0 ? (
                <Card style={{ marginTop: space.lg }}>
                  <EmptyState icon={BarChart2} title="İlk denemeni ekle" description="YKS’nin yanında okulundaki KDS ve SDS sınavlarını, LGS, KPSS, ALES, DGS, YDS, YÖKDİL ve MSÜ denemelerini de kaydedebilirsin." action="Deneme ekle" onAction={() => openEntry(null)} />
                </Card>
              ) : active === OVERVIEW ? (
                <View style={{ gap: space.md, marginTop: space.lg }}>
                  <View style={styles.kpiGrid}>
                    <Kpi label="Toplam deneme" value={exams.length} hint={`${summaries.length} sınav türü`} />
                    <Kpi label="Bu ay" value={examsThisMonth(exams, todayStr())} hint="Kayıtlı deneme" />
                    <Kpi label="Ort. başarı" value={formatRate(summary.averageRate)} hint="Net / soru" />
                    <Kpi label="En iyi" value={formatRate(summary.bestRate)} hint="Tüm denemeler" />
                  </View>
                  {overviewRows.length > 1 ? (
                    <Card style={{ gap: space.md }}>
                      <Text variant="label" color="textMuted">Birleşik görünüm</Text>
                      <Text variant="heading">Başarı oranı gelişimi</Text>
                      <MultiLineChart rows={overviewRows} series={summaries.map((item) => ({ key: item.code, label: item.shortName, color: item.color }))} />
                      <View style={styles.legend}>{summaries.map((item) => <View key={item.code} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: item.color }]} /><Text variant="captionStrong" color="textMuted">{item.shortName}</Text></View>)}</View>
                      <Text variant="caption" color="textSubtle">Soru sayıları farklı olduğu için burada netin soru sayısına oranı karşılaştırılır. Ham net gelişimi her sınavın kendi sekmesinde.</Text>
                    </Card>
                  ) : null}
                  {summaries.map((item) => (
                    <Card key={item.code} onPress={() => setTab(item.code)} style={{ gap: space.sm }}>
                      <View style={styles.rowCenter}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text variant="subheading" style={{ flex: 1 }}>{item.shortName}</Text>
                        <Text variant="caption" color="textMuted">{item.count} deneme</Text>
                      </View>
                      <View style={styles.rowCenter}>
                        <Text variant="title">{formatNet(item.lastNet)}</Text>
                        <Text variant="caption" color="textMuted" style={{ flex: 1 }}>son net</Text>
                        <Delta value={item.delta} />
                      </View>
                      <View style={styles.rowCenter}>
                        <Text variant="caption" color="textMuted">Ort. {formatNet(item.averageNet)} · En iyi {formatNet(item.bestNet)}</Text>
                        <RateBar value={item.averageRate} color={item.color} />
                        <Text variant="captionStrong">{formatRate(item.averageRate)}</Text>
                      </View>
                    </Card>
                  ))}
                  <Text variant="heading" style={{ marginTop: space.sm }}>Son kayıtlar</Text>
                  {ordered(exams).slice(0, 4).map((exam) => <ExamCard key={exam.id} exam={exam} onDelete={remove} showType />)}
                </View>
              ) : typeExams.length === 0 ? (
                <Card style={{ marginTop: space.lg }}>
                  <EmptyState icon={Target} title={`Henüz ${activeType?.short_name || ''} denemen yok`} description={activeType?.description || 'Deneme sonuçlarını ekleyerek gelişimini analiz et.'} action={`${activeType?.short_name || ''} denemesi ekle`} onAction={() => openEntry(active)} />
                </Card>
              ) : (
                <View style={{ gap: space.md, marginTop: space.lg }}>
                  <View>
                    <Text variant="heading">{activeType?.name}</Text>
                    <Text variant="caption" color="textMuted">{penaltyLabel(typeExams[0]?.penalty ?? activeType?.wrong_penalty)}</Text>
                  </View>
                  <View style={styles.kpiGrid}>
                    <Kpi label="Son net" value={formatNet(summary.lastNet)}><Delta value={summary.delta} /></Kpi>
                    <Kpi label="Ortalama" value={formatNet(summary.averageNet)} hint={`${summary.count} deneme`} />
                    <Kpi label="En iyi" value={formatNet(summary.bestNet)} hint="Kişisel rekor" />
                    <Kpi label="Ort. başarı" value={formatRate(summary.averageRate)} hint={`Son: ${formatRate(summary.lastRate)}`} />
                  </View>
                  {typeExams.length > 1 ? (
                    <Card style={{ gap: space.md }}>
                      <View style={styles.rowCenter}><TrendingUp size={18} color={color} /><Text variant="heading">Net gelişimi</Text></View>
                      <AreaChart data={ordered(typeExams).reverse().map((exam) => ({ label: formatShortDate(exam.date), value: exam.net }))} height={220} color={color} formatValue={(value) => `${formatNet(value)} net`} />
                    </Card>
                  ) : null}
                  <Card style={{ gap: space.sm }}>
                    <Text variant="label" color="textMuted">Ayrı ayrı</Text>
                    <Text variant="heading">Ders bazında performans</Text>
                    {subjects.map((subject) => {
                      const selected = activeSubject?.key === subject.key;
                      return (
                        <Pressable key={subject.key} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSubjectKey(subject.key)}
                          style={[styles.subject, { borderColor: selected ? color : colors.border, backgroundColor: selected ? `${color}12` : colors.surfaceMuted }]}>
                          <View style={styles.rowCenter}>
                            <Text variant="captionStrong" numberOfLines={1} style={{ flex: 1 }}>{subject.label}</Text>
                            {weakest.includes(subject.key) ? <View style={[styles.priority, { backgroundColor: colors.warningSoft }]}><Text variant="captionStrong" color="warning" style={{ fontSize: 11 }}>Öncelik</Text></View> : null}
                            <Delta value={subject.delta} />
                          </View>
                          <View style={styles.rowCenter}>
                            <Text variant="caption" color="textMuted">Son {formatNet(subject.lastNet)}/{subject.lastQuestionCount} · Ort. {formatNet(subject.averageNet)} · En iyi {formatNet(subject.bestNet)}</Text>
                          </View>
                          <View style={styles.rowCenter}><RateBar value={subject.averageRate} color={color} /><Text variant="captionStrong">{formatRate(subject.averageRate)}</Text></View>
                        </Pressable>
                      );
                    })}
                    {activeSubject && activeSubject.points.length > 1 ? (
                      <View style={{ gap: space.sm, marginTop: space.sm }}>
                        <Text variant="subheading">{activeSubject.label} gelişimi</Text>
                        <AreaChart data={activeSubject.points.map((point: { date: string; net: number }) => ({ label: formatShortDate(point.date), value: point.net }))} height={180} color={color} formatValue={(value) => `${formatNet(value)} net`} />
                      </View>
                    ) : null}
                  </Card>
                  <Text variant="heading" style={{ marginTop: space.sm }}>Deneme geçmişi</Text>
                  {ordered(typeExams).map((exam) => <ExamCard key={exam.id} exam={exam} onDelete={remove} />)}
                </View>
              )}
            </>
          )}

      {entry ? (
        <ExamEntrySheet key={entry.key} open onClose={() => setEntry(null)} types={types} typesByCode={typesByCode} allowedYks={allowedYks}
          initialCode={entry.code} courses={query.data?.courses || []} track={profile?.alan_secimi ?? undefined} yksYear={Number(profile?.yks_year || 2027)}
          previousExams={previousExams} onSubmit={submit} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  delta: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, height: 24, borderRadius: radius.full, alignSelf: 'flex-start' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  kpi: { flexGrow: 1, flexBasis: 150, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderBottomWidth: 3, gap: 2 },
  examHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  total: { alignItems: 'flex-end', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.sm },
  detail: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.xs, borderWidth: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  subject: { padding: space.md, borderRadius: radius.sm, borderWidth: 1, gap: 6 },
  priority: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
});
