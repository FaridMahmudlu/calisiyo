// Shared deneme (mock exam) rules for the web dashboard and the mobile app.
// The exam catalog itself lives in the `exam_types` table so new Turkish exams
// can be added without an app release; this module only interprets it.

export const YKS_EXAM_CODES = ['TYT', 'AYT', 'YDT'];

export const EXAM_TYPE_COLUMNS = 'code,short_name,name,category,description,color,wrong_penalty,penalty_editable,sections_editable,requires_title,uses_curriculum,grade_levels,sections,grade_presets,default_duration_minutes,official_source_url,sort_order,is_active';

export const EXAM_COLUMNS = 'id,sinav_turu,yayin,tarih,sure_dakika,grade_level,wrong_penalty,exam_title,created_at,deneme_detaylari(id,ders_id,section_key,section_label,question_count,dogru,yanlis,bos,net,dersler(ad,renk,ikon,sira))';

export const EXAM_CATEGORIES = [
  { value: 'yks', label: 'YKS' },
  { value: 'okul', label: 'Okul denemeleri' },
  { value: 'lgs', label: 'LGS' },
  { value: 'kpss', label: 'KPSS' },
  { value: 'lisansustu', label: 'ALES ve DGS' },
  { value: 'dil', label: 'Yabancı dil' },
  { value: 'msu', label: 'MSÜ' },
  { value: 'diger', label: 'Diğer' },
];

export const PENALTY_OPTIONS = [
  { value: 4, label: '4 yanlış 1 doğruyu götürür', short: '4Y = 1D' },
  { value: 3, label: '3 yanlış 1 doğruyu götürür', short: '3Y = 1D' },
  { value: 0, label: 'Yanlışlar doğruyu götürmez', short: 'Götürmez' },
];

const FALLBACK_COLOR = '#00A870';

export function penaltyLabel(penalty) {
  return PENALTY_OPTIONS.find((option) => option.value === Number(penalty))?.label || PENALTY_OPTIONS[0].label;
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calcNet(correct, wrong, penalty = 4) {
  const right = Number(correct) || 0;
  const missed = Number(wrong) || 0;
  return round2(Number(penalty) > 0 ? right - missed / Number(penalty) : right);
}

export function formatNet(value, digits = 2) {
  const number = Number(value) || 0;
  return number.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function formatRate(value) {
  return `%${Math.round(Number(value) || 0).toLocaleString('tr-TR')}`;
}

export function formatDelta(value, digits = 2) {
  const number = round2(value);
  if (!number) return '0';
  return `${number > 0 ? '+' : '−'}${formatNet(Math.abs(number), digits)}`;
}

// Mirrors public.exam_section_key() in the database.
export function sectionKey(label) {
  const lowered = String(label || '')
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[çğıöşüâîû]/g, (char) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[char]);
  const key = lowered.replace(/[^a-z0-9]+/g, '_').slice(0, 40).replace(/^_+|_+$/g, '');
  return key || 'bolum';
}

export function uniqueSectionKey(label, takenKeys) {
  const base = sectionKey(label).slice(0, 36);
  if (!takenKeys.includes(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}_${index}`;
    if (!takenKeys.includes(candidate)) return candidate;
  }
  return `${base}_${Date.now() % 1000}`;
}

export function sortExamTypes(types = []) {
  return [...types].sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100) || String(a.code).localeCompare(String(b.code)));
}

export function examTypeMap(types = []) {
  return Object.fromEntries(types.map((type) => [type.code, type]));
}

export function groupExamTypes(types = [], { allowedYks } = {}) {
  const active = sortExamTypes(types).filter((type) => type.is_active !== false)
    .filter((type) => type.category !== 'yks' || !allowedYks || allowedYks.includes(type.code));
  return EXAM_CATEGORIES
    .map((category) => ({ ...category, types: active.filter((type) => type.category === category.value) }))
    .filter((category) => category.types.length > 0);
}

export function isCurriculumExam(type) {
  return Boolean(type?.uses_curriculum) || YKS_EXAM_CODES.includes(type?.code);
}

function sectionEnabledFor(section, track) {
  if (section.on === undefined || section.on === true) return true;
  if (section.on === false) return false;
  return Array.isArray(section.on) && section.on.includes(track);
}

// Sections a new entry starts with: the student's last exam of the same type and
// grade (so publisher-specific formats are remembered), otherwise the catalog preset.
/** @param {any} type @param {{ grade?: number | null, track?: string, previousExams?: any[] }} [options] */
export function initialSections(type, { grade, track, previousExams = [] } = {}) {
  if (!type || isCurriculumExam(type)) return [];
  const gradeLevels = type.grade_levels || [];
  const preset = gradeLevels.length ? type.grade_presets?.[String(grade)]?.sections || [] : type.sections || [];
  if (!type.sections_editable) {
    return preset.map((section) => ({ key: section.key, label: section.label, questionCount: Number(section.question_count), group: section.group || null, enabled: true }));
  }
  const previous = previousExams.find((exam) => exam.code === type.code && (!gradeLevels.length || Number(exam.grade) === Number(grade)));
  if (previous?.sections?.length) {
    const used = previous.sections.map((section) => ({ key: section.key, label: section.label, questionCount: section.questionCount, group: null, enabled: true }));
    const unused = preset.filter((section) => !used.some((item) => item.key === section.key))
      .map((section) => ({ key: section.key, label: section.label, questionCount: Number(section.question_count), group: null, enabled: false }));
    return [...used, ...unused];
  }
  return preset.map((section) => ({
    key: section.key,
    label: section.label,
    questionCount: Number(section.question_count),
    group: section.group || null,
    enabled: sectionEnabledFor(section, track),
  }));
}

export function defaultPenalty(type, grade) {
  if (!type) return 4;
  const preset = type.grade_presets?.[String(grade)];
  return Number(preset?.penalty ?? type.wrong_penalty ?? 4);
}

export function defaultDuration(type, grade) {
  const preset = type?.grade_presets?.[String(grade)];
  const minutes = preset?.duration ?? type?.default_duration_minutes;
  return minutes ? String(minutes) : '';
}

export function examLabel(type, code) {
  return type?.short_name || code || 'Deneme';
}

export function normalizeExam(exam, typesByCode = {}) {
  const type = typesByCode[exam.sinav_turu];
  const penalty = Number(exam.wrong_penalty ?? type?.wrong_penalty ?? 4);
  const sections = [...(exam.deneme_detaylari || [])]
    .sort((a, b) => (a.dersler?.sira ?? 999) - (b.dersler?.sira ?? 999))
    .map((detail) => {
      const correct = Number(detail.dogru) || 0;
      const wrong = Number(detail.yanlis) || 0;
      const blank = Number(detail.bos) || 0;
      const questionCount = Number(detail.question_count) || correct + wrong + blank;
      return {
        id: detail.id,
        key: detail.section_key || sectionKey(detail.dersler?.ad),
        label: detail.section_label || detail.dersler?.ad || 'Ders',
        color: detail.dersler?.renk || null,
        icon: detail.dersler?.ikon || null,
        questionCount,
        correct,
        wrong,
        blank,
        net: round2(detail.net ?? calcNet(correct, wrong, penalty)),
      };
    });
  const net = round2(sections.reduce((sum, section) => sum + section.net, 0));
  const questionTotal = sections.reduce((sum, section) => sum + section.questionCount, 0);
  return {
    id: exam.id,
    code: exam.sinav_turu,
    shortName: examLabel(type, exam.sinav_turu),
    typeName: type?.name || exam.sinav_turu,
    color: type?.color || FALLBACK_COLOR,
    publisher: exam.yayin,
    title: exam.exam_title || null,
    date: exam.tarih,
    createdAt: exam.created_at,
    duration: exam.sure_dakika || null,
    grade: exam.grade_level || null,
    penalty,
    sections,
    net,
    questionTotal,
    correct: sections.reduce((sum, section) => sum + section.correct, 0),
    wrong: sections.reduce((sum, section) => sum + section.wrong, 0),
    blank: sections.reduce((sum, section) => sum + section.blank, 0),
    rate: questionTotal ? Math.max(0, Math.min(100, (net / questionTotal) * 100)) : 0,
  };
}

const chronological = (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));

export function sortChronological(exams) {
  return [...exams].sort(chronological);
}

export function summarizeExams(exams) {
  const ordered = sortChronological(exams);
  if (!ordered.length) return { count: 0, lastNet: 0, delta: 0, averageNet: 0, bestNet: 0, averageRate: 0, bestRate: 0, lastRate: 0, last: null };
  const last = ordered.at(-1);
  const previous = ordered.at(-2);
  const nets = ordered.map((exam) => exam.net);
  const rates = ordered.map((exam) => exam.rate);
  return {
    count: ordered.length,
    last,
    lastNet: last.net,
    lastRate: last.rate,
    delta: previous ? round2(last.net - previous.net) : 0,
    rateDelta: previous ? last.rate - previous.rate : 0,
    averageNet: round2(nets.reduce((sum, value) => sum + value, 0) / nets.length),
    bestNet: Math.max(...nets),
    averageRate: rates.reduce((sum, value) => sum + value, 0) / rates.length,
    bestRate: Math.max(...rates),
  };
}

// Per-subject statistics inside one exam type (sections matched by key).
export function subjectBreakdown(exams) {
  const ordered = sortChronological(exams);
  const subjects = new Map();
  ordered.forEach((exam) => {
    exam.sections.forEach((section) => {
      const current = subjects.get(section.key) || { key: section.key, label: section.label, color: section.color, points: [] };
      current.label = section.label;
      current.color = section.color || current.color;
      current.points.push({ examId: exam.id, date: exam.date, net: section.net, questionCount: section.questionCount, rate: section.questionCount ? Math.max(0, (section.net / section.questionCount) * 100) : 0, correct: section.correct, wrong: section.wrong, blank: section.blank });
      subjects.set(section.key, current);
    });
  });
  const latestOrder = ordered.at(-1)?.sections.map((section) => section.key) || [];
  return [...subjects.values()].map((subject) => {
    const nets = subject.points.map((point) => point.net);
    const rates = subject.points.map((point) => point.rate);
    const last = subject.points.at(-1);
    const previous = subject.points.at(-2);
    return {
      ...subject,
      count: subject.points.length,
      lastNet: last.net,
      lastQuestionCount: last.questionCount,
      delta: previous ? round2(last.net - previous.net) : 0,
      averageNet: round2(nets.reduce((sum, value) => sum + value, 0) / nets.length),
      bestNet: Math.max(...nets),
      averageRate: rates.reduce((sum, value) => sum + value, 0) / rates.length,
      wrongTotal: subject.points.reduce((sum, point) => sum + point.wrong, 0),
      blankTotal: subject.points.reduce((sum, point) => sum + point.blank, 0),
    };
  }).sort((a, b) => {
    const ai = latestOrder.indexOf(a.key);
    const bi = latestOrder.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

// One summary row per exam type, ordered by catalog order.
export function typeSummaries(exams, typesByCode = {}) {
  const groups = new Map();
  exams.forEach((exam) => groups.set(exam.code, [...(groups.get(exam.code) || []), exam]));
  return [...groups.entries()].map(([code, list]) => ({
    code,
    shortName: list[0].shortName,
    typeName: list[0].typeName,
    color: list[0].color,
    sortOrder: typesByCode[code]?.sort_order ?? 100,
    ...summarizeExams(list),
  })).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Combined chart rows: one row per exam, success rate stored under its type code.
// Different exams have different question totals, so the combined view compares
// rate (net / questions) instead of raw nets.
export function overviewSeries(exams, formatLabel = (date) => date) {
  return sortChronological(exams).map((exam) => ({
    id: exam.id,
    label: formatLabel(exam.date),
    date: exam.date,
    code: exam.code,
    shortName: exam.shortName,
    publisher: exam.title || exam.publisher,
    net: exam.net,
    questionTotal: exam.questionTotal,
    [exam.code]: round2(exam.rate),
  }));
}

export function examsThisMonth(exams, today) {
  const month = String(today || '').slice(0, 7);
  return exams.filter((exam) => String(exam.date).slice(0, 7) === month).length;
}

export function validateSections(sections, { editable }) {
  const filled = sections.filter((section) => section.enabled !== false && (section.correct !== '' || section.wrong !== ''));
  if (!filled.length) return { error: 'Analiz için en az bir dersin doğru veya yanlış sayısını girmelisin.' };
  for (const section of filled) {
    const correct = Number(section.correct || 0);
    const wrong = Number(section.wrong || 0);
    const total = Number(section.questionCount || 0);
    if (!Number.isInteger(correct) || !Number.isInteger(wrong) || correct < 0 || wrong < 0) {
      return { error: `${section.label}: doğru ve yanlış sayıları negatif olmayan tam sayı olmalı.` };
    }
    if (editable && (!String(section.label || '').trim() || String(section.label).trim().length > 60)) {
      return { error: 'Ders adı 1-60 karakter olmalı.' };
    }
    if (!Number.isInteger(total) || total < 1 || total > 200) {
      return { error: `${section.label}: soru sayısı 1-200 arasında olmalı.` };
    }
    if (correct + wrong > total) {
      return { error: `${section.label}: doğru ve yanlış toplamı ${total} soruyu aşamaz.` };
    }
  }
  const totalQuestions = filled.reduce((sum, section) => sum + Number(section.questionCount || 0), 0);
  if (totalQuestions > 400) return { error: 'Bir denemede en fazla 400 soru olabilir.' };
  return {
    sections: filled.map((section) => ({
      key: section.key,
      label: String(section.label).trim(),
      question_count: String(Number(section.questionCount)),
      dogru: String(Number(section.correct || 0)),
      yanlis: String(Number(section.wrong || 0)),
    })),
  };
}
