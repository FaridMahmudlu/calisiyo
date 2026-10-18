import * as Haptics from 'expo-haptics';
import { ArrowLeft, Check, Info, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  PENALTY_OPTIONS, calcNet, defaultDuration, defaultPenalty, formatNet, formatRate, groupExamTypes,
  initialSections, isCurriculumExam, penaltyLabel, uniqueSectionKey, validateSections,
} from '@shared/exams/catalog';
import { todayStr } from '@shared/utils/date';
import { Button, DateField, IconButton, Select, Sheet, Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

export type ExamTypeRow = {
  code: string; short_name: string; name: string; category: string; description?: string | null; color: string;
  wrong_penalty: number; penalty_editable: boolean; sections_editable: boolean; requires_title: boolean; uses_curriculum: boolean;
  grade_levels: number[]; sections: unknown[]; grade_presets: Record<string, unknown>; default_duration_minutes?: number | null;
  official_source_url?: string | null; sort_order: number; is_active: boolean;
};
export type ExamCourse = { id: string; ad: string; renk?: string | null; ikon?: string | null; sira?: number | null; question_count?: number | null; sinav_turu: string };
export type PreviousExam = { code: string; grade: number | null; sections: { key: string; label: string; questionCount: number }[] };
export type ExamPayload = { rpc: 'create_exam_with_details' | 'create_exam_result'; args: Record<string, unknown> };
type Row = {
  key: string; label: string; questionCount: number | string; correct: string; wrong: string; enabled: boolean;
  custom?: boolean; locked?: boolean; group?: string | null; icon?: string | null;
};
type Form = { publisher: string; date: string; duration: string; grade: number | null; penalty: number; title: string };

const digits = (value: string) => value.replace(/\D/g, '').slice(0, 3);

function guessGrade(type: ExamTypeRow | undefined, yksYear: number | undefined, previous: PreviousExam[]) {
  const levels = type?.grade_levels || [];
  if (!levels.length) return null;
  const last = previous.find((exam) => exam.code === type?.code && exam.grade);
  if (last?.grade && levels.includes(last.grade)) return last.grade;
  const now = new Date();
  const schoolYearEnd = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const guess = Math.min(12, Math.max(9, 12 - (Number(yksYear || schoolYearEnd) - schoolYearEnd)));
  return levels.includes(guess) ? guess : levels[levels.length - 1];
}

function buildRows(type: ExamTypeRow | undefined, grade: number | null, track: string | undefined, courses: ExamCourse[], previous: PreviousExam[]): Row[] {
  if (!type) return [];
  if (isCurriculumExam(type)) {
    return courses.filter((course) => course.sinav_turu === type.code).map((course) => ({
      key: course.id, label: course.ad, icon: course.ikon, questionCount: Number(course.question_count) || 0,
      enabled: Boolean(course.question_count), locked: !course.question_count, correct: '', wrong: '',
    }));
  }
  return (initialSections(type, { grade, track, previousExams: previous }) as Row[]).map((section) => ({ ...section, correct: '', wrong: '' }));
}

export function ExamEntrySheet({ open, onClose, types, typesByCode, allowedYks, initialCode, courses, track, yksYear, previousExams, onSubmit }: {
  open: boolean; onClose: () => void; types: ExamTypeRow[]; typesByCode: Record<string, ExamTypeRow>; allowedYks: string[];
  initialCode: string | null; courses: ExamCourse[]; track?: string; yksYear?: number; previousExams: PreviousExam[];
  onSubmit: (payload: ExamPayload) => Promise<{ error?: string }>;
}) {
  const { colors } = useTheme();
  const [code, setCode] = useState<string | null>(initialCode);
  const type = code ? typesByCode[code] : undefined;
  const initialGrade = guessGrade(type, yksYear, previousExams);
  const [form, setForm] = useState<Form>(() => ({ publisher: '', date: todayStr(), duration: defaultDuration(type, initialGrade), grade: initialGrade, penalty: defaultPenalty(type, initialGrade), title: '' }));
  const [rows, setRows] = useState<Row[]>(() => buildRows(type, initialGrade, track, courses, previousExams));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const groups = useMemo(() => groupExamTypes(types, { allowedYks }) as { value: string; label: string; types: ExamTypeRow[] }[], [types, allowedYks]);
  const curriculum = isCurriculumExam(type);
  const editable = Boolean(type?.sections_editable);
  const penalty = curriculum ? 4 : Number(form.penalty ?? 4);

  const pick = (next: string) => {
    const nextType = typesByCode[next];
    const grade = guessGrade(nextType, yksYear, previousExams);
    Haptics.selectionAsync().catch(() => undefined);
    setCode(next);
    setError('');
    setForm({ publisher: '', date: todayStr(), duration: defaultDuration(nextType, grade), grade, penalty: defaultPenalty(nextType, grade), title: '' });
    setRows(buildRows(nextType, grade, track, courses, previousExams));
  };
  const changeGrade = (value: string) => {
    const grade = Number(value);
    setForm((current) => ({ ...current, grade, penalty: defaultPenalty(type, grade), duration: current.duration || defaultDuration(type, grade) }));
    setRows(buildRows(type, grade, track, courses, previousExams));
  };
  const update = (index: number, patch: Partial<Row>) => setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  const rename = (index: number, label: string) => setRows((current) => current.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    const taken = current.filter((_, other) => other !== index).map((item) => item.key);
    return { ...row, label, key: row.custom ? uniqueSectionKey(label || 'ders', taken) : row.key };
  }));
  const addRow = () => setRows((current) => {
    const label = `Ders ${current.length + 1}`;
    return [...current, { key: uniqueSectionKey(label, current.map((row) => row.key)), label, questionCount: 20, enabled: true, custom: true, correct: '', wrong: '' }];
  });

  const totals = rows.filter((row) => row.enabled && (row.correct !== '' || row.wrong !== '')).reduce((sum, row) => ({
    net: sum.net + calcNet(row.correct, row.wrong, penalty), questions: sum.questions + Number(row.questionCount || 0),
  }), { net: 0, questions: 0 });

  const save = async () => {
    if (!type) return;
    setError('');
    const publisher = form.publisher.trim();
    if (publisher.length < 2) return setError('Yayın veya kurum adını en az 2 karakter olacak şekilde yaz.');
    if (!form.date || form.date > todayStr()) return setError('Deneme tarihi bugün veya daha eski olmalı.');
    const duration = form.duration === '' ? null : Number(form.duration);
    if (duration !== null && (duration < 1 || duration > 600)) return setError('Deneme süresi 1 ile 600 dakika arasında olmalı.');
    if (type.requires_title && form.title.trim().length < 2) return setError('Deneme adını yaz (ör. Okul ortak sınavı).');
    const checked = validateSections(rows.filter((row) => row.enabled), { editable }) as { error?: string; sections?: { key: string; label: string; question_count: string; dogru: string; yanlis: string }[] };
    if (checked.error || !checked.sections) return setError(checked.error || 'Ders sonuçlarını kontrol et.');
    setSaving(true);
    const payload: ExamPayload = curriculum
      ? { rpc: 'create_exam_with_details', args: { p_exam_type: type.code, p_publisher: publisher, p_exam_date: form.date, p_duration_minutes: duration, p_details: checked.sections.map((section) => ({ ders_id: section.key, dogru: Number(section.dogru), yanlis: Number(section.yanlis) })) } }
      : { rpc: 'create_exam_result', args: {
        p_exam_type: type.code, p_publisher: publisher, p_exam_date: form.date, p_duration_minutes: duration, p_sections: checked.sections,
        p_grade_level: type.grade_levels?.length ? Number(form.grade) : null, p_wrong_penalty: type.penalty_editable ? Number(form.penalty) : null, p_title: form.title.trim() || null,
      } };
    const result = await onSubmit(payload);
    setSaving(false);
    if (result.error) setError(result.error);
  };

  return (
    <Sheet open={open} onClose={() => !saving && onClose()} title={type ? `Yeni ${type.short_name} denemesi` : 'Deneme ekle'} subtitle={type ? type.name : 'Sonucunu kaydedeceğin sınav türünü seç.'}
      footer={type ? <Button title={saving ? 'Kaydediliyor…' : 'Denemeyi kaydet'} loading={saving} onPress={save} style={{ flex: 1 }} /> : undefined}>
      {!type ? (
        <View style={{ gap: space.lg }}>
          {groups.map((group) => (
            <View key={group.value} style={{ gap: space.sm }}>
              <Text variant="label" color="textMuted">{group.label}</Text>
              {group.types.map((item) => (
                <Pressable key={item.code} accessibilityRole="button" onPress={() => pick(item.code)}
                  style={({ pressed }) => [styles.typeRow, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{item.short_name}</Text>
                    <Text variant="caption" color="textMuted" numberOfLines={2}>{item.name}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={[styles.typeRow, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.dot, { backgroundColor: type.color }]} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{type.short_name}</Text>
              <Text variant="caption" color="textMuted">{curriculum ? 'Konu takibindeki derslerinle eşleşir' : penaltyLabel(penalty)}</Text>
            </View>
            <Button title="Değiştir" icon={ArrowLeft} variant="ghost" size="sm" onPress={() => { setCode(null); setError(''); }} />
          </View>
          <TextField label={type.category === 'okul' ? 'Yayın veya okul' : 'Yayın / kurum'} value={form.publisher} maxLength={120}
            onChangeText={(publisher) => setForm({ ...form, publisher })} placeholder={type.category === 'okul' ? 'ör. Okul ortak sınavı' : 'ör. Türkiye Geneli'} />
          {type.requires_title || editable ? (
            <TextField label={type.requires_title ? 'Deneme adı' : 'Deneme adı (isteğe bağlı)'} value={form.title} maxLength={80} onChangeText={(title) => setForm({ ...form, title })} placeholder="ör. 1. dönem 2. KDS" />
          ) : null}
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1.4 }}><DateField label="Tarih" value={form.date} onChange={(date) => setForm({ ...form, date })} maximumDate={new Date()} /></View>
            <View style={{ flex: 1 }}><TextField label="Süre (dk)" value={form.duration} keyboardType="number-pad" onChangeText={(value) => setForm({ ...form, duration: digits(value) })} placeholder="120" /></View>
          </View>
          {type.grade_levels?.length || type.penalty_editable ? (
            <View style={{ flexDirection: 'row', gap: space.md }}>
              {type.grade_levels?.length ? <View style={{ flex: 1 }}><Select label="Sınıf" value={String(form.grade ?? '')} onChange={changeGrade} options={type.grade_levels.map((grade) => ({ value: String(grade), label: `${grade}. sınıf` }))} /></View> : null}
              {type.penalty_editable ? <View style={{ flex: 1.3 }}><Select label="Yanlış kuralı" value={String(form.penalty)} onChange={(value) => setForm({ ...form, penalty: Number(value) })} options={PENALTY_OPTIONS.map((option) => ({ value: String(option.value), label: option.short, description: option.label }))} /></View> : null}
            </View>
          ) : null}
          <View style={styles.hint}>
            <Info size={15} color={colors.textMuted} />
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>{editable ? 'Ders listesi ve soru sayıları sınavına göre düzenlenebilir; bir sonraki kayıtta bu düzen hatırlanır.' : 'Yalnızca çözdüğün derslerin sonuçlarını gir. Boş ve net otomatik hesaplanır.'}</Text>
          </View>
          {rows.map((row, index) => {
            const blank = Math.max(0, Number(row.questionCount || 0) - Number(row.correct || 0) - Number(row.wrong || 0));
            const over = Number(row.correct || 0) + Number(row.wrong || 0) > Number(row.questionCount || 0);
            const inputStyle = [styles.num, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }];
            return (
              <View key={`${row.key}-${index}`} style={[styles.row, { borderColor: over ? colors.danger : colors.border, backgroundColor: over ? colors.dangerSoft : colors.surfaceMuted, opacity: row.enabled ? 1 : 0.6 }]}>
                <View style={styles.rowHead}>
                  {editable && !row.custom ? (
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: row.enabled }} accessibilityLabel={`${row.label} dersini dahil et`} hitSlop={8}
                      onPress={() => { Haptics.selectionAsync().catch(() => undefined); update(index, { enabled: !row.enabled }); }}
                      style={[styles.check, { borderColor: row.enabled ? colors.primary : colors.borderStrong, backgroundColor: row.enabled ? colors.primary : colors.surface }]}>
                      {row.enabled ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}
                    </Pressable>
                  ) : null}
                  {row.custom ? (
                    <TextInput value={row.label} onChangeText={(label) => rename(index, label)} maxLength={60} accessibilityLabel="Ders adı"
                      style={[styles.labelInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} />
                  ) : (
                    <Text variant="captionStrong" numberOfLines={1} style={{ flex: 1 }}>{row.icon ? `${row.icon} ` : ''}{row.label}</Text>
                  )}
                  <Text variant="captionStrong" color={row.enabled ? 'text' : 'textSubtle'}>Net {row.enabled ? formatNet(calcNet(row.correct, row.wrong, penalty)) : '—'}</Text>
                  {row.custom ? <IconButton icon={Trash2} label={`${row.label || 'Ders'} satırını sil`} onPress={() => setRows((current) => current.filter((_, other) => other !== index))} size={34} /> : null}
                </View>
                {row.locked ? <Text variant="caption" color="textMuted">Bu dersin soru sayısı henüz tanımlı değil.</Text> : (
                  <View style={styles.inputs}>
                    <View style={styles.field}>
                      <Text variant="caption" color="textMuted">Soru</Text>
                      {editable ? <TextInput value={String(row.questionCount)} editable={row.enabled} keyboardType="number-pad" accessibilityLabel={`${row.label} soru sayısı`} onChangeText={(value) => update(index, { questionCount: digits(value) })} style={inputStyle} />
                        : <Text variant="bodyStrong" style={styles.static}>{row.questionCount}</Text>}
                    </View>
                    {(['correct', 'wrong'] as const).map((field) => (
                      <View key={field} style={styles.field}>
                        <Text variant="caption" color="textMuted">{field === 'correct' ? 'Doğru' : 'Yanlış'}</Text>
                        <TextInput value={row[field]} editable={row.enabled} keyboardType="number-pad" placeholder={field === 'correct' ? 'D' : 'Y'} placeholderTextColor={colors.textSubtle}
                          accessibilityLabel={`${row.label} ${field === 'correct' ? 'doğru' : 'yanlış'}`} onChangeText={(value) => update(index, { [field]: digits(value) })}
                          style={[...inputStyle, row[field] !== '' && { borderColor: field === 'correct' ? colors.primaryBorder : colors.danger }]} />
                      </View>
                    ))}
                    <View style={styles.field}>
                      <Text variant="caption" color="textMuted">Boş</Text>
                      <Text variant="bodyStrong" color="textMuted" style={styles.static}>{row.enabled ? blank : '—'}</Text>
                    </View>
                  </View>
                )}
                {over ? <Text variant="caption" color="danger">Doğru ve yanlış toplamı {row.questionCount} soruyu aşamaz.</Text> : null}
              </View>
            );
          })}
          {editable && rows.length < 30 ? <Button title="Ders ekle" icon={Plus} variant="soft" size="sm" onPress={addRow} style={{ alignSelf: 'flex-start' }} /> : null}
          <View style={[styles.summary, { backgroundColor: colors.primarySoft }]}>
            {[['Toplam net', formatNet(totals.net)], ['Soru', String(totals.questions)], ['Başarı', totals.questions ? formatRate(Math.max(0, (totals.net / totals.questions) * 100)) : '—']].map(([label, value]) => (
              <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="caption" color="textMuted">{label}</Text>
                <Text variant="heading">{value}</Text>
              </View>
            ))}
          </View>
          {error ? <Text variant="captionStrong" color="danger" accessibilityLiveRegion="polite">{error}</Text> : null}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  typeRow: { minHeight: 60, paddingHorizontal: space.md, paddingVertical: space.sm, borderWidth: 1, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  row: { padding: space.md, borderWidth: 1, borderRadius: radius.sm, gap: space.sm },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  labelInput: { flex: 1, height: 40, paddingHorizontal: 10, borderWidth: 1.5, borderRadius: radius.xs, fontFamily: fonts.bold, fontSize: 14 },
  inputs: { flexDirection: 'row', gap: space.sm },
  field: { flex: 1, gap: 4, alignItems: 'center' },
  num: { width: '100%', height: 44, borderWidth: 1.5, borderRadius: radius.xs, textAlign: 'center', fontFamily: fonts.bold, fontSize: 16 },
  static: { height: 44, lineHeight: 44, textAlign: 'center' },
  summary: { flexDirection: 'row', padding: space.md, borderRadius: radius.sm },
});
