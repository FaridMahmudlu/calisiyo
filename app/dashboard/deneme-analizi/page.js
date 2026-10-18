'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, CalendarDays, Clock3, Layers, Plus, Target, Trash2, TrendingUp,
} from 'lucide-react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';
import { formatDate, formatShortDate, todayStr } from '@/lib/utils/date';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import {
  EXAM_COLUMNS, EXAM_TYPE_COLUMNS, examTypeMap, examsThisMonth, formatDelta, formatNet, formatRate,
  normalizeExam, overviewSeries, penaltyLabel, sortExamTypes, subjectBreakdown, summarizeExams, typeSummaries,
} from '@/lib/exams/catalog';
import PageHeader from '@/components/ui/PageHeader';
import JourneyLoader from '@/components/ui/JourneyLoader';
import ExamEntryModal from '@/components/exams/ExamEntryModal';
import { NetTrendChart, RateOverviewChart } from '@/components/exams/ExamCharts';
import './exams.css';

const REALTIME_TABLES = ['denemeler'];
const OVERVIEW = 'overview';
const TAB_STORAGE_KEY = 'planliyo-exam-tab';

function Delta({ value, suffix = '' }) {
  if (!value) return <span className="exam-delta is-flat">±0{suffix}</span>;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={`exam-delta ${up ? 'is-up' : 'is-down'}`}><Icon size={14} />{formatDelta(value)}{suffix}</span>;
}

function Kpi({ label, value, hint, children }) {
  return (
    <div className="exam-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      {children || (hint ? <small>{hint}</small> : null)}
    </div>
  );
}

function RateBar({ value, color }) {
  return <i className="exam-rate-bar" aria-hidden="true"><b style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></i>;
}

function ExamCard({ exam, onDelete, showType }) {
  return (
    <article className="exam-card" style={{ '--exam-color': exam.color }}>
      <header>
        <div>
          {showType && <span className="exam-type-badge">{exam.shortName}</span>}
          <h3>{exam.title || exam.publisher}</h3>
          <p>
            <span><CalendarDays size={13} />{formatDate(exam.date)}</span>
            {exam.title && <span><BookOpen size={13} />{exam.publisher}</span>}
            {exam.duration && <span><Clock3 size={13} />{exam.duration} dk</span>}
            {exam.grade && <span>{exam.grade}. sınıf</span>}
          </p>
        </div>
        <div className="exam-card-total">
          <small>Net</small>
          <strong>{formatNet(exam.net)}</strong>
          <span>{exam.questionTotal} soruda {formatRate(exam.rate)}</span>
        </div>
      </header>
      <div className="exam-card-table" role="table" aria-label={`${exam.title || exam.publisher} ders sonuçları`}>
        {exam.sections.map((section) => (
          <div key={section.id} role="row">
            <span role="cell" className="exam-card-subject">{section.label}</span>
            <span role="cell" className="is-correct">{section.correct} D</span>
            <span role="cell" className="is-wrong">{section.wrong} Y</span>
            <span role="cell" className="is-blank">{section.blank} B</span>
            <strong role="cell">{formatNet(section.net)}<small>/{section.questionCount}</small></strong>
          </div>
        ))}
      </div>
      <footer>
        <span>{penaltyLabel(exam.penalty)}</span>
        <button type="button" className="study-button study-button-danger exam-delete" onClick={() => onDelete(exam)}><Trash2 size={15} /> Sil</button>
      </footer>
    </article>
  );
}

function OverviewPanel({ exams, summaries, onOpenType, onDelete }) {
  const rows = useMemo(() => overviewSeries(exams, formatShortDate), [exams]);
  const series = summaries.map((item) => ({ code: item.code, shortName: item.shortName, color: item.color }));
  const overall = summarizeExams(exams);
  const recent = useMemo(() => [...exams].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 4), [exams]);

  return (
    <div className="exam-panel">
      <div className="exam-kpis">
        <Kpi label="Toplam deneme" value={exams.length} hint={`${summaries.length} farklı sınav türü`} />
        <Kpi label="Bu ay" value={examsThisMonth(exams, todayStr())} hint="Kayıtlı deneme" />
        <Kpi label="Ortalama başarı" value={formatRate(overall.averageRate)} hint="Net / soru sayısı" />
        <Kpi label="En iyi başarı" value={formatRate(overall.bestRate)} hint="Tüm denemeler" />
      </div>

      {rows.length > 1 ? (
        <section className="study-panel exam-chart-card">
          <header>
            <div><span className="exam-eyebrow">Birleşik görünüm</span><h2>Başarı oranı gelişimi</h2></div>
            <ul className="exam-legend">{series.map((item) => <li key={item.code}><i style={{ background: item.color }} />{item.shortName}</li>)}</ul>
          </header>
          <RateOverviewChart rows={rows} series={series} />
          <p className="exam-footnote">Sınavların soru sayıları farklı olduğu için bu grafik ham net yerine netin soru sayısına oranını karşılaştırır. Ham net gelişimini her sınavın kendi sekmesinde görebilirsin.</p>
        </section>
      ) : null}

      <section className="exam-type-grid" aria-label="Sınav türlerine göre özet">
        {summaries.map((item) => (
          <button type="button" key={item.code} className="exam-type-card" style={{ '--exam-color': item.color }} onClick={() => onOpenType(item.code)}>
            <header><span className="exam-type-dot" aria-hidden="true" /><strong>{item.shortName}</strong><small>{item.count} deneme</small></header>
            <div className="exam-type-card-net"><strong>{formatNet(item.lastNet)}</strong><span>son net</span><Delta value={item.delta} /></div>
            <dl>
              <div><dt>Ortalama</dt><dd>{formatNet(item.averageNet)}</dd></div>
              <div><dt>En iyi</dt><dd>{formatNet(item.bestNet)}</dd></div>
              <div><dt>Başarı</dt><dd>{formatRate(item.averageRate)}</dd></div>
            </dl>
            <RateBar value={item.averageRate} color={item.color} />
            <em>Ayrıntılı analiz <ArrowUpRight size={14} /></em>
          </button>
        ))}
      </section>

      <section className="exam-history">
        <h2>Son kayıtlar</h2>
        <div className="exam-card-list">{recent.map((exam) => <ExamCard key={exam.id} exam={exam} onDelete={onDelete} showType />)}</div>
      </section>
    </div>
  );
}

function TypePanel({ type, exams, onAdd, onDelete }) {
  const summary = useMemo(() => summarizeExams(exams), [exams]);
  const subjects = useMemo(() => subjectBreakdown(exams), [exams]);
  const [subjectKey, setSubjectKey] = useState(null);
  const activeSubject = subjects.find((subject) => subject.key === subjectKey) || subjects[0];
  const ordered = useMemo(() => [...exams].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt))), [exams]);
  const points = useMemo(() => [...ordered].reverse().map((exam) => ({ label: formatShortDate(exam.date), net: exam.net, rate: exam.rate, questionTotal: exam.questionTotal, publisher: exam.title || exam.publisher })), [ordered]);
  const subjectPoints = activeSubject ? activeSubject.points.map((point) => ({
    label: formatShortDate(point.date), net: point.net, rate: point.rate, questionTotal: point.questionCount,
    publisher: activeSubject.label,
  })) : [];
  const weakest = [...subjects].filter((subject) => subject.count > 0).sort((a, b) => a.averageRate - b.averageRate).slice(0, Math.min(2, Math.max(0, subjects.length - 1))).map((subject) => subject.key);
  const color = type?.color || '#00A870';
  const maxQuestions = Math.max(...exams.map((exam) => exam.questionTotal), 0);

  if (!exams.length) {
    return (
      <div className="exam-panel">
        <div className="study-panel exam-empty" style={{ '--exam-color': color }}>
          <span className="exam-empty-icon"><Target size={26} /></span>
          <h2>Henüz {type?.short_name || ''} denemen yok</h2>
          <p>{type?.description || 'Deneme sonuçlarını ekleyerek gelişimini analiz et.'}</p>
          <button type="button" className="study-button study-button-primary" onClick={() => onAdd(type?.code)}><Plus size={16} /> {type?.short_name} denemesi ekle</button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-panel" style={{ '--exam-color': color }}>
      <div className="exam-type-intro">
        <div>
          <span className="exam-type-badge">{type?.short_name}</span>
          <h2>{type?.name}</h2>
          <p>{penaltyLabel(exams.at(-1)?.penalty ?? type?.wrong_penalty)}{type?.official_source_url ? ' · ' : ''}{type?.official_source_url ? <a href={type.official_source_url} target="_blank" rel="noopener noreferrer">Resmî kaynak</a> : null}</p>
        </div>
        <button type="button" className="study-button" onClick={() => onAdd(type?.code)}><Plus size={16} /> {type?.short_name} ekle</button>
      </div>

      <div className="exam-kpis is-five">
        <Kpi label="Deneme" value={summary.count} hint={`Son: ${formatShortDate(summary.last.date)}`} />
        <Kpi label="Son net" value={formatNet(summary.lastNet)}><Delta value={summary.delta} /></Kpi>
        <Kpi label="Ortalama net" value={formatNet(summary.averageNet)} hint={`${maxQuestions} soru üzerinden`} />
        <Kpi label="En iyi net" value={formatNet(summary.bestNet)} hint="Kişisel rekor" />
        <Kpi label="Ortalama başarı" value={formatRate(summary.averageRate)} hint={`Son: ${formatRate(summary.lastRate)}`} />
      </div>

      {points.length > 1 && (
        <section className="study-panel exam-chart-card">
          <header><div><span className="exam-eyebrow">{type?.short_name} toplamı</span><h2>Net gelişimi</h2></div></header>
          <NetTrendChart points={points} maxValue={maxQuestions} color={color} average={summary.averageNet} ariaLabel={`${type?.short_name} net gelişimi`} />
        </section>
      )}

      <section className="study-panel exam-subjects">
        <header>
          <div><span className="exam-eyebrow">Ayrı ayrı</span><h2>Ders bazında performans</h2></div>
          {weakest.length > 0 && <p>Öncelik: <strong>{subjects.filter((subject) => weakest.includes(subject.key)).map((subject) => subject.label).join(', ')}</strong></p>}
        </header>
        <div className="exam-subject-table" role="group" aria-label="Ders bazında performans. Gelişim grafiği için bir ders seç.">
          <div className="exam-subject-head" aria-hidden="true">
            <span>Ders</span><span>Son</span><span>Ortalama</span><span>En iyi</span><span>Başarı</span><span>Değişim</span>
          </div>
          {subjects.map((subject) => (
            <button type="button" key={subject.key} className={`exam-subject-row ${activeSubject?.key === subject.key ? 'is-active' : ''}`} onClick={() => setSubjectKey(subject.key)} aria-pressed={activeSubject?.key === subject.key}>
              <span className="exam-subject-name">{subject.label}{weakest.includes(subject.key) && <em>Öncelik</em>}</span>
              <span><span className="sr-only">Son net </span>{formatNet(subject.lastNet)}<small>/{subject.lastQuestionCount}</small></span>
              <span><span className="sr-only">Ortalama </span>{formatNet(subject.averageNet)}</span>
              <span><span className="sr-only">En iyi </span>{formatNet(subject.bestNet)}</span>
              <span className="exam-subject-rate"><span className="sr-only">Başarı </span><RateBar value={subject.averageRate} color={color} />{formatRate(subject.averageRate)}</span>
              <span><Delta value={subject.delta} /></span>
            </button>
          ))}
        </div>
        {activeSubject && subjectPoints.length > 1 && (
          <div className="exam-subject-chart">
            <h3><TrendingUp size={17} /> {activeSubject.label} gelişimi</h3>
            <NetTrendChart points={subjectPoints} maxValue={activeSubject.lastQuestionCount} color={color} average={activeSubject.averageNet} ariaLabel={`${activeSubject.label} net gelişimi`} />
          </div>
        )}
      </section>

      <section className="exam-history">
        <h2>Deneme geçmişi</h2>
        <div className="exam-card-list">{ordered.map((exam) => <ExamCard key={exam.id} exam={exam} onDelete={onDelete} />)}</div>
      </section>
    </div>
  );
}

export default function DenemeAnaliziPage() {
  const { profile, setError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const allowedYks = useMemo(() => getExamTabs(profile?.alan_secimi), [profile?.alan_secimi]);
  const [types, setTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(() => (typeof window === 'undefined' ? null : window.localStorage.getItem(TAB_STORAGE_KEY)));
  const [entry, setEntry] = useState(null);
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    if (!profile) return;
    const [typeResult, examResult, courseResult] = await Promise.all([
      supabase.from('exam_types').select(EXAM_TYPE_COLUMNS).order('sort_order'),
      supabase.from('denemeler').select(EXAM_COLUMNS).eq('user_id', profile.id).order('tarih', { ascending: false }).limit(500),
      supabase.from('dersler').select('id,ad,renk,ikon,sira,question_count,sinav_turu')
        .in('sinav_turu', getExamTabs(profile.alan_secimi))
        .eq('curriculum_year', Number(profile.yks_year || 2027))
        .contains('alan', [profile.alan_secimi])
        .order('sira'),
    ]);
    if (typeResult.error || examResult.error || courseResult.error) setError('Deneme verileri yüklenemedi. Lütfen sayfayı yenile.');
    setTypes(sortExamTypes(typeResult.data || []));
    setRows(examResult.data || []);
    setCourses(courseResult.data || []);
    setLoading(false);
  }, [profile, setError, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: loadData });

  const typesByCode = useMemo(() => examTypeMap(types), [types]);
  const exams = useMemo(() => rows.map((row) => normalizeExam(row, typesByCode)), [rows, typesByCode]);
  const summaries = useMemo(() => typeSummaries(exams, typesByCode), [exams, typesByCode]);
  const tabCodes = useMemo(() => {
    const codes = new Set([...allowedYks, ...summaries.map((item) => item.code)]);
    return [...codes].sort((a, b) => (typesByCode[a]?.sort_order ?? 100) - (typesByCode[b]?.sort_order ?? 100));
  }, [allowedYks, summaries, typesByCode]);

  const fallbackTab = summaries.length > 1 ? OVERVIEW : summaries[0]?.code || allowedYks[0];
  const activeTab = [OVERVIEW, ...tabCodes].includes(tab) ? tab : fallbackTab;
  const selectTab = (next) => {
    setTab(next);
    window.localStorage.setItem(TAB_STORAGE_KEY, next);
  };

  const openEntry = (code = null) => setEntry({ code: code && typesByCode[code] ? code : null, key: Date.now() });

  const submitExam = async ({ rpc, args }) => {
    const { error } = await supabase.rpc(rpc, args);
    if (error) {
      if (error.code === '54000') return { error: 'Bu ayki deneme kayıt limitine ulaştın. Paketini yükselterek daha fazla deneme kaydedebilirsin.' };
      return { error: error.message || 'Deneme kaydedilemedi. Bilgileri kontrol edip tekrar dene.' };
    }
    setEntry(null);
    selectTab(args.p_exam_type);
    setNotice(`${typesByCode[args.p_exam_type]?.short_name || 'Deneme'} sonucun kaydedildi.`);
    window.setTimeout(() => setNotice(''), 4000);
    await loadData();
    return {};
  };

  const deleteExam = async (exam) => {
    if (!window.confirm(`“${exam.title || exam.publisher}” denemesi ve tüm ders sonuçları silinsin mi?`)) return;
    const { error } = await supabase.from('denemeler').delete().eq('id', exam.id).eq('user_id', profile.id);
    if (error) return setError(`Deneme silinemedi: ${error.message}`);
    loadData();
  };

  const previousExams = useMemo(() => [...exams].sort((a, b) => String(b.date).localeCompare(String(a.date))), [exams]);

  return (
    <div className="page exam-page">
      <PageHeader
        title="Deneme Analizi"
        description="TYT, AYT, KDS, SDS, LGS, KPSS ve diğer denemelerini kaydet; netlerini hem tüm sınavlar birlikte hem de her sınav ve ders için ayrı ayrı izle."
        actions={<button className="study-button study-button-primary" onClick={() => openEntry(activeTab === OVERVIEW ? null : activeTab)}><Plus size={16} /> Deneme ekle</button>}
      />

      {notice && <p className="exam-notice" role="status">{notice}</p>}

      {loading ? (
        <JourneyLoader compact label="Denemelerin hazırlanıyor" />
      ) : (
        <>
          <nav className="exam-tabs" aria-label="Sınav türleri">
            <button type="button" className={activeTab === OVERVIEW ? 'is-active' : ''} aria-current={activeTab === OVERVIEW ? 'page' : undefined} onClick={() => selectTab(OVERVIEW)}><Layers size={15} /> Genel bakış</button>
            {tabCodes.map((code) => {
              const count = summaries.find((item) => item.code === code)?.count || 0;
              return (
                <button type="button" key={code} className={activeTab === code ? 'is-active' : ''} aria-current={activeTab === code ? 'page' : undefined} onClick={() => selectTab(code)} style={{ '--exam-color': typesByCode[code]?.color }}>
                  <span className="exam-type-dot" aria-hidden="true" />{typesByCode[code]?.short_name || code}{count > 0 && <small>{count}</small>}
                </button>
              );
            })}
            <button type="button" className="exam-tab-add" onClick={() => openEntry(null)}><Plus size={15} /> Başka sınav</button>
          </nav>

          {exams.length === 0 ? (
            <div className="study-panel exam-empty">
              <span className="exam-empty-icon"><BarChart3 size={26} /></span>
              <h2>İlk denemeni ekle</h2>
              <p>YKS denemelerinin yanında okulundaki KDS ve SDS sınavlarını, LGS, KPSS, ALES, DGS, YDS, YÖKDİL ve MSÜ denemelerini de kaydedebilirsin. Netler ve başarı oranı otomatik hesaplanır.</p>
              <div className="exam-empty-types">{types.filter((type) => type.is_active).map((type) => <span key={type.code} style={{ '--exam-color': type.color }}><i className="exam-type-dot" />{type.short_name}</span>)}</div>
              <button type="button" className="study-button study-button-primary" onClick={() => openEntry(null)}><Plus size={16} /> Deneme ekle</button>
            </div>
          ) : activeTab === OVERVIEW ? (
            <OverviewPanel exams={exams} summaries={summaries} onOpenType={selectTab} onDelete={deleteExam} />
          ) : (
            <TypePanel key={activeTab} type={typesByCode[activeTab]} exams={exams.filter((exam) => exam.code === activeTab)} onAdd={openEntry} onDelete={deleteExam} />
          )}
        </>
      )}

      {entry && (
        <ExamEntryModal
          key={entry.key}
          open
          onClose={() => setEntry(null)}
          types={types}
          typesByCode={typesByCode}
          allowedYks={allowedYks}
          initialCode={entry.code}
          courses={courses}
          profile={profile}
          previousExams={previousExams}
          onSubmit={submitExam}
        />
      )}
    </div>
  );
}
