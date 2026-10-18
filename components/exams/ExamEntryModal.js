'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Info, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { todayStr } from '@/lib/utils/date';
import {
  PENALTY_OPTIONS, calcNet, defaultDuration, defaultPenalty, formatNet, formatRate, groupExamTypes,
  initialSections, isCurriculumExam, penaltyLabel, uniqueSectionKey, validateSections,
} from '@/lib/exams/catalog';

const digits = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 3);

// Best guess for school exams: YKS 2027 in the 2026-27 school year means 12th grade.
function guessGrade(type, profile, previousExams) {
  const levels = type?.grade_levels || [];
  if (!levels.length) return null;
  const previous = previousExams.find((exam) => exam.code === type.code && exam.grade);
  if (previous && levels.includes(previous.grade)) return previous.grade;
  const now = new Date();
  const schoolYearEnd = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const guess = 12 - (Number(profile?.yks_year || schoolYearEnd) - schoolYearEnd);
  const clamped = Math.min(12, Math.max(9, guess));
  return levels.includes(clamped) ? clamped : levels.at(-1);
}

function buildRows(type, { grade, track, courses, previousExams }) {
  if (!type) return [];
  if (isCurriculumExam(type)) {
    return courses.filter((course) => course.sinav_turu === type.code).map((course) => ({
      key: course.id, dersId: course.id, label: course.ad, color: course.renk, icon: course.ikon,
      questionCount: Number(course.question_count) || 0, enabled: Boolean(course.question_count), locked: !course.question_count,
      correct: '', wrong: '',
    }));
  }
  return initialSections(type, { grade, track, previousExams }).map((section) => ({ ...section, correct: '', wrong: '' }));
}

function initialState(type, context) {
  const grade = guessGrade(type, context.profile, context.previousExams);
  return {
    form: {
      publisher: '',
      date: todayStr(),
      duration: defaultDuration(type, grade),
      grade,
      penalty: defaultPenalty(type, grade),
      title: '',
    },
    rows: buildRows(type, { grade, track: context.profile?.alan_secimi, courses: context.courses, previousExams: context.previousExams }),
  };
}

export default function ExamEntryModal({ open, onClose, types, typesByCode, allowedYks, initialCode, courses, profile, previousExams, onSubmit }) {
  const context = useMemo(() => ({ profile, courses, previousExams }), [profile, courses, previousExams]);
  const [code, setCode] = useState(initialCode || null);
  const type = code ? typesByCode[code] : null;
  const [state, setState] = useState(() => initialState(type, context));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const groups = useMemo(() => groupExamTypes(types, { allowedYks }), [types, allowedYks]);
  const curriculum = isCurriculumExam(type);
  const editable = Boolean(type?.sections_editable);
  const { form, rows } = state;

  const pickType = (nextCode) => {
    const nextType = typesByCode[nextCode];
    setCode(nextCode);
    setError('');
    setState(initialState(nextType, context));
  };

  const setField = (field, value) => setState((current) => ({ ...current, form: { ...current.form, [field]: value } }));

  const changeGrade = (value) => {
    const grade = Number(value);
    setState((current) => ({
      form: { ...current.form, grade, penalty: defaultPenalty(type, grade), duration: current.form.duration || defaultDuration(type, grade) },
      rows: buildRows(type, { grade, track: profile?.alan_secimi, courses, previousExams }),
    }));
  };

  const updateRow = (index, patch) => setState((current) => ({
    ...current,
    rows: current.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
  }));

  const addRow = () => setState((current) => {
    const label = `Ders ${current.rows.length + 1}`;
    return {
      ...current,
      rows: [...current.rows, { key: uniqueSectionKey(label, current.rows.map((row) => row.key)), label, questionCount: 20, enabled: true, custom: true, correct: '', wrong: '' }],
    };
  });

  const renameRow = (index, label) => setState((current) => ({
    ...current,
    rows: current.rows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const taken = current.rows.filter((_, other) => other !== index).map((item) => item.key);
      return { ...row, label, key: row.custom ? uniqueSectionKey(label || 'ders', taken) : row.key };
    }),
  }));

  const removeRow = (index) => setState((current) => ({ ...current, rows: current.rows.filter((_, rowIndex) => rowIndex !== index) }));

  const penalty = curriculum ? 4 : Number(form.penalty ?? 4);
  const activeRows = rows.filter((row) => row.enabled);
  const totals = activeRows.reduce((sum, row) => {
    const entered = row.correct !== '' || row.wrong !== '';
    if (!entered) return sum;
    return { net: sum.net + calcNet(row.correct, row.wrong, penalty), questions: sum.questions + Number(row.questionCount || 0) };
  }, { net: 0, questions: 0 });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const publisher = form.publisher.trim();
    if (publisher.length < 2) return setError('Yayın veya kurum adını en az 2 karakter olacak şekilde yaz.');
    if (!form.date || form.date > todayStr()) return setError('Deneme tarihi bugün veya daha eski olmalı.');
    const duration = form.duration === '' ? null : Number(form.duration);
    if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 600)) return setError('Deneme süresi 1 ile 600 dakika arasında olmalı.');
    if (type.requires_title && form.title.trim().length < 2) return setError('Deneme adını yaz (ör. Okul ortak sınavı).');
    const checked = validateSections(activeRows, { editable });
    if (checked.error) return setError(checked.error);

    setSaving(true);
    const payload = curriculum
      ? {
        rpc: 'create_exam_with_details',
        args: {
          p_exam_type: type.code, p_publisher: publisher, p_exam_date: form.date, p_duration_minutes: duration,
          p_details: checked.sections.map((section) => ({ ders_id: section.key, dogru: Number(section.dogru), yanlis: Number(section.yanlis) })),
        },
      }
      : {
        rpc: 'create_exam_result',
        args: {
          p_exam_type: type.code, p_publisher: publisher, p_exam_date: form.date, p_duration_minutes: duration,
          p_sections: checked.sections,
          p_grade_level: type.grade_levels?.length ? Number(form.grade) : null,
          p_wrong_penalty: type.penalty_editable ? Number(form.penalty) : null,
          p_title: form.title.trim() || null,
        },
      };
    const result = await onSubmit(payload);
    setSaving(false);
    if (result?.error) setError(result.error);
  };

  const close = () => { if (!saving) onClose(); };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={type ? `Yeni ${type.short_name} denemesi` : 'Deneme ekle'}
      description={type ? type.name : 'Sonucunu kaydedeceğin sınav türünü seç.'}
    >
      {!type ? (
        <div className="exam-type-picker">
          {groups.map((group) => (
            <section key={group.value} aria-labelledby={`exam-group-${group.value}`}>
              <h3 id={`exam-group-${group.value}`}>{group.label}</h3>
              <div>
                {group.types.map((item) => (
                  <button type="button" key={item.code} onClick={() => pickType(item.code)} style={{ '--exam-color': item.color }}>
                    <span className="exam-type-dot" aria-hidden="true" />
                    <strong>{item.short_name}</strong>
                    <small>{item.name}</small>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <form className="exam-entry" onSubmit={submit} noValidate>
          <div className="exam-entry-type" style={{ '--exam-color': type.color }}>
            <span className="exam-type-dot" aria-hidden="true" />
            <div><strong>{type.short_name}</strong><small>{curriculum ? 'Konu takibindeki derslerinle eşleşir' : penaltyLabel(penalty)}</small></div>
            {!initialCode || groups.length > 1 ? (
              <button type="button" className="exam-link-button" onClick={() => { setCode(null); setError(''); }}><ArrowLeft size={15} /> Sınav türünü değiştir</button>
            ) : null}
          </div>

          <div className="exam-entry-fields">
            <label className="is-wide">
              <span>{type.category === 'okul' ? 'Yayın veya okul' : 'Yayın / kurum'}</span>
              <input value={form.publisher} onChange={(event) => setField('publisher', event.target.value)} placeholder={type.category === 'okul' ? 'ör. Okul ortak sınavı, 3D Yayınları' : 'ör. Türkiye Geneli, 3D'} maxLength={120} required autoComplete="off" />
            </label>
            {(type.requires_title || editable) && (
              <label className="is-wide">
                <span>{type.requires_title ? 'Deneme adı' : 'Deneme adı (isteğe bağlı)'}</span>
                <input value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="ör. 1. dönem 2. KDS" maxLength={80} autoComplete="off" />
              </label>
            )}
            <label>
              <span>Tarih</span>
              <input type="date" value={form.date} max={todayStr()} onChange={(event) => setField('date', event.target.value)} required />
            </label>
            <label>
              <span>Süre (dk)</span>
              <input inputMode="numeric" value={form.duration} onChange={(event) => setField('duration', digits(event.target.value))} placeholder="ör. 120" />
            </label>
            {type.grade_levels?.length > 0 && (
              <label>
                <span>Sınıf</span>
                <Select ariaLabel="Sınıf düzeyi" value={String(form.grade || '')} onChange={changeGrade} options={type.grade_levels.map((grade) => ({ value: String(grade), label: `${grade}. sınıf` }))} />
              </label>
            )}
            {type.penalty_editable && (
              <label>
                <span>Yanlış kuralı</span>
                <Select ariaLabel="Yanlış kuralı" value={String(form.penalty)} onChange={(value) => setField('penalty', Number(value))} options={PENALTY_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }))} />
              </label>
            )}
          </div>

          <p className="exam-entry-hint"><Info size={15} />{editable
            ? 'Ders listesi ve soru sayıları sınavına göre düzenlenebilir; bir sonraki kayıtta bu düzen hatırlanır. Boş bırakılan dersler kaydedilmez.'
            : 'Yalnızca çözdüğün derslerin sonuçlarını gir. Boş ve net otomatik hesaplanır.'}</p>

          <div className="exam-sections" role="table" aria-label="Ders sonuçları">
            <div className="exam-sections-head" role="row">
              <span role="columnheader">Ders</span>
              <span role="columnheader">Soru</span>
              <span role="columnheader">Doğru</span>
              <span role="columnheader">Yanlış</span>
              <span role="columnheader">Boş</span>
              <span role="columnheader">Net</span>
            </div>
            {rows.map((row, index) => {
              const blank = Math.max(0, Number(row.questionCount || 0) - Number(row.correct || 0) - Number(row.wrong || 0));
              const over = Number(row.correct || 0) + Number(row.wrong || 0) > Number(row.questionCount || 0);
              return (
                <div key={`${row.key}-${index}`} className={`exam-section-row ${row.enabled ? '' : 'is-off'} ${over ? 'is-invalid' : ''}`} role="row">
                  <div className="exam-section-name" role="cell">
                    {editable && !row.custom && (
                      <button type="button" className={`exam-check ${row.enabled ? 'is-on' : ''}`} aria-pressed={row.enabled} aria-label={`${row.label} dersini ${row.enabled ? 'çıkar' : 'ekle'}`} onClick={() => updateRow(index, { enabled: !row.enabled })}>
                        {row.enabled && <Check size={13} strokeWidth={3} />}
                      </button>
                    )}
                    {row.custom ? (
                      <input className="exam-section-label-input" value={row.label} aria-label="Ders adı" maxLength={60} onChange={(event) => renameRow(index, event.target.value)} />
                    ) : (
                      <span title={row.label}>{row.icon ? `${row.icon} ` : ''}{row.label}{row.group ? <small>{row.group}</small> : null}</span>
                    )}
                    {row.custom && <button type="button" className="icon-button" aria-label={`${row.label || 'Ders'} satırını sil`} onClick={() => removeRow(index)}><Trash2 size={15} /></button>}
                  </div>
                  <div role="cell">
                    {editable ? (
                      <input className="exam-num" inputMode="numeric" aria-label={`${row.label} soru sayısı`} value={row.questionCount} disabled={!row.enabled}
                        onChange={(event) => updateRow(index, { questionCount: digits(event.target.value) })} />
                    ) : <span className="exam-static">{row.locked ? '—' : row.questionCount}</span>}
                  </div>
                  <div role="cell"><input className="exam-num is-correct" inputMode="numeric" aria-label={`${row.label} doğru`} placeholder="D" value={row.correct} disabled={!row.enabled} onChange={(event) => updateRow(index, { correct: digits(event.target.value) })} /></div>
                  <div role="cell"><input className="exam-num is-wrong" inputMode="numeric" aria-label={`${row.label} yanlış`} placeholder="Y" value={row.wrong} disabled={!row.enabled} onChange={(event) => updateRow(index, { wrong: digits(event.target.value) })} /></div>
                  <div role="cell"><span className="exam-static"><span className="sr-only">Boş </span>{row.enabled ? blank : '—'}</span></div>
                  <div role="cell"><span className="exam-static is-net"><span className="sr-only">Net </span>{row.enabled ? formatNet(calcNet(row.correct, row.wrong, penalty)) : '—'}</span></div>
                  {row.locked && <small className="exam-row-note">Bu dersin soru sayısı henüz tanımlı değil.</small>}
                  {over && <small className="exam-row-note is-error">Doğru ve yanlış toplamı {row.questionCount} soruyu aşamaz.</small>}
                </div>
              );
            })}
          </div>
          {editable && rows.length < 30 && (
            <button type="button" className="exam-link-button exam-add-row" onClick={addRow}><Plus size={16} /> Ders ekle</button>
          )}

          <div className="exam-entry-summary" aria-live="polite">
            <div><span>Toplam net</span><strong>{formatNet(totals.net)}</strong></div>
            <div><span>Soru</span><strong>{totals.questions}</strong></div>
            <div><span>Başarı</span><strong>{totals.questions ? formatRate(Math.max(0, (totals.net / totals.questions) * 100)) : '—'}</strong></div>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="study-button" onClick={close} disabled={saving}>Vazgeç</button>
            <button type="submit" className="study-button study-button-primary" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Denemeyi kaydet'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
