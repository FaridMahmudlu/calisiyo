'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';
import { formatDate, todayStr } from '@/lib/utils/date';
import { motion } from 'framer-motion';
import { 
  BarChart2, Plus, Trash2, BookOpen, AlertCircle, TrendingUp 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import PageHeader from '@/components/ui/PageHeader';
import JourneyLoader from '@/components/ui/JourneyLoader';

const REALTIME_TABLES = ['denemeler'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

function ExamTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-title">{payload[0].payload.yayin}</p>
        <p className="chart-tooltip-desc">{label}</p>
        <p className="chart-tooltip-val">Net: <span>{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
}

export default function DenemeAnaliziPage() {
  const { profile, setError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const examTabs = profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'];

  const [activeTab, setActiveTab] = useState('TYT');
  const [denemeler, setDenemeler] = useState([]);
  const [dersler, setDersler] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    yayin: '',
    tarih: todayStr(),
    sure_dakika: '',
    detaylar: {},
  });

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const [examResult, courseResult] = await Promise.all([
      supabase
        .from('denemeler')
        .select('*, deneme_detaylari(*, dersler(ad, renk, ikon))')
        .eq('user_id', profile.id)
        .eq('sinav_turu', activeTab)
        .order('tarih', { ascending: false }),
      supabase
        .from('dersler')
        .select('*')
        .eq('sinav_turu', activeTab)
        .eq('curriculum_year', Number(profile.yks_year || 2027))
        .contains('alan', [profile.alan_secimi])
        .order('sira'),
    ]);
    const loadError = examResult.error || courseResult.error;
    if (loadError) setError('Deneme verileri yüklenemedi. Lütfen tekrar dene.');
    setDenemeler(examResult.data || []);
    setDersler(courseResult.data || []);
    setLoading(false);
  }, [activeTab, profile, setError, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);
  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: loadData });

  function openAddModal() {
    const initialDetaylar = {};
    dersler.forEach(d => {
      initialDetaylar[d.id] = { dogru: '', yanlis: '' };
    });
    setForm({
      yayin: '',
      tarih: todayStr(),
      sure_dakika: '',
      detaylar: initialDetaylar,
    });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();

    const duration = form.sure_dakika === '' ? null : Number(form.sure_dakika);
    if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 600)) {
      return setError('Deneme süresi 1 ile 600 dakika arasında olmalıdır.');
    }
    const enteredDetails = Object.entries(form.detaylar).filter(([, detail]) => ['dogru', 'yanlis'].some((field) => detail[field] !== ''));
    if (!enteredDetails.length) return setError('Analiz için en az bir ders sonucu girmelisin.');
    const invalidDetail = enteredDetails.some(([courseId, detail]) => (
      ['dogru', 'yanlis'].some((field) => {
        if (detail[field] === '') return false;
        const value = Number(detail[field]);
        return !Number.isInteger(value) || value < 0;
      }) || (() => {
        const course = dersler.find((item) => item.id === courseId);
        const total = Number(detail.dogru || 0) + Number(detail.yanlis || 0);
        return !Number(course?.question_count || 0) || total > Number(course.question_count);
      })()
    ));
    if (invalidDetail) return setError('Doğru ve yanlış değerleri negatif olmayan tam sayı olmalı; toplamları dersin soru sayısını aşmamalıdır.');

    setSaving(true);

    const details = enteredDetails.map(([dersId, value]) => ({
      ders_id: dersId, dogru: Number(value.dogru || 0), yanlis: Number(value.yanlis || 0),
    }));
    const { error: examError } = await supabase.rpc('create_exam_with_details', {
      p_exam_type: activeTab, p_publisher: form.yayin.trim(), p_exam_date: form.tarih,
      p_duration_minutes: duration, p_details: details,
    });
    if (examError) { setSaving(false); setError(examError.message || 'Deneme kaydedilemedi. Bilgileri kontrol edip tekrar dene.'); return; }

    setShowModal(false);
    setSaving(false);
    await loadData();
  }

  async function handleDelete(id) {
    if (!window.confirm('Bu deneme ve tüm ders sonuçları silinsin mi?')) return;
    const { error: deleteError } = await supabase.from('denemeler').delete().eq('id', id).eq('user_id', profile.id);
    if (deleteError) return setError(`Deneme silinemedi: ${deleteError.message}`);
    loadData();
  }

  function calculateTotalNet(deneme) {
    return deneme.deneme_detaylari?.reduce((sum, d) => sum + (d.net || 0), 0).toFixed(2);
  }

  // Prepare chart data (reverse to show chronological order)
  const chartData = [...denemeler].reverse().map(deneme => ({
    name: formatDate(deneme.tarih).split(' ')[0] + ' ' + formatDate(deneme.tarih).split(' ')[1],
    net: parseFloat(calculateTotalNet(deneme)),
    yayin: deneme.yayin
  }));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <PageHeader title="Deneme Analizi" description="TYT, AYT veya YDT denemelerini ders ayrıntılarıyla kaydet; net gelişimini gerçek sonuçlarla izle." actions={<button className="study-button study-button-primary" onClick={openAddModal}><Plus size={16} /> Deneme ekle</button>} />
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="study-segments">
          {examTabs.map(tab => (
            <button key={tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <JourneyLoader compact label="Denemelerin hazırlanıyor" />
      ) : denemeler.length === 0 ? (
        <div className="card empty-state">
          <BarChart2 size={48} className="empty-state-icon" />
          <div className="empty-state-title">Henüz deneme eklenmemiş</div>
          <div className="empty-state-text">Deneme sonuçlarını ekleyerek gelişimini analiz et.</div>
        </div>
      ) : (
        <>
          {chartData.length > 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card chart-card" 
              style={{ marginBottom: '24px' }}
            >
              <h3 className="chart-title"><TrendingUp size={20} className="chart-icon" /> Net Gelişimi</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} 
                    />
                    <Tooltip content={<ExamTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="net" 
                      stroke="var(--primary-500)" 
                      strokeWidth={4}
                      dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-primary)' }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary-600)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="deneme-list"
          >
            {denemeler.map(deneme => (
              <motion.div variants={itemVariants} key={deneme.id} className="card deneme-card">
                <div className="deneme-header">
                  <div>
                    <span className="deneme-yayin"><BookOpen size={16} /> {deneme.yayin}</span>
                    <span className="deneme-date">{formatDate(deneme.tarih)}</span>
                  </div>
                  <div className="deneme-total">
                    <span className="deneme-total-label">Toplam Net</span>
                    <span className="deneme-total-value">{calculateTotalNet(deneme)}</span>
                  </div>
                </div>
                
                {deneme.deneme_detaylari?.length > 0 && (
                  <div className="deneme-details">
                    {deneme.deneme_detaylari.map(d => (
                      <div key={d.id} className="detail-row">
                        <span className="detail-ders" style={{ color: d.dersler?.renk }}>
                          {d.dersler?.ikon} {d.dersler?.ad}
                        </span>
                        <div className="detail-nums">
                          <span className="detail-d">D: {d.dogru}</span>
                          <span className="detail-y">Y: {d.yanlis}</span>
                          <span className="detail-b">B: {d.bos}</span>
                          <span className="detail-net">Net: {d.net?.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
                  <button className="btn btn-ghost btn-sm btn-delete" onClick={() => handleDelete(deneme.id)}>
                    <Trash2 size={16} /> Sil
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-exam-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 className="modal-title" id="new-exam-title">Yeni {activeTab} Denemesi</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="input-group">
                  <label className="input-label">Yayın Adı</label>
                  <input className="input" aria-label="Yayın Adı" value={form.yayin} onChange={(e) => setForm({ ...form, yayin: e.target.value })} placeholder="ör. 3D Türkiye Geneli" minLength={2} maxLength={120} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Tarih</label>
                  <input className="input" aria-label="Tarih" type="date" max={todayStr()} value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Süre (dk)</label>
                  <input className="input" aria-label="Süre (dk)" type="number" value={form.sure_dakika} onChange={(e) => setForm({ ...form, sure_dakika: e.target.value })} placeholder="165" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={16} color="var(--text-tertiary)" />
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ders bazlı sonuçlar</h4>
              </div>
              <div className="ders-input-legend" aria-hidden="true"><span>Ders</span><span>Doğru</span><span>Yanlış</span><span>Boş (otomatik)</span><span>Net</span></div>
              
              <div className="ders-inputs">
                {dersler.map(d => (
                  <div key={d.id} className="ders-input-row">
                    <span className="ders-input-name" style={{ color: d.renk }}>{d.ikon} {d.ad}</span>
                    <div className="ders-input-fields">
                      <input className="input ders-input-mini" aria-label={`${d.ad} doğru`} type="number" step="1" placeholder="D"
                        value={form.detaylar[d.id]?.dogru || ''}
                        onChange={(e) => setForm({
                          ...form,
                          detaylar: { ...form.detaylar, [d.id]: { ...form.detaylar[d.id], dogru: e.target.value } }
                        })} />
                      <input className="input ders-input-mini" aria-label={`${d.ad} yanlış`} type="number" step="1" placeholder="Y"
                        value={form.detaylar[d.id]?.yanlis || ''}
                        onChange={(e) => setForm({
                          ...form,
                          detaylar: { ...form.detaylar, [d.id]: { ...form.detaylar[d.id], yanlis: e.target.value } }
                        })} />
                      <output className="ders-auto-blank" aria-label={`${d.ad} boş soru`}>
                        {d.question_count
                          ? Math.max(0, Number(d.question_count) - Number(form.detaylar[d.id]?.dogru || 0) - Number(form.detaylar[d.id]?.yanlis || 0))
                          : '—'}
                      </output>
                      <output className="ders-live-net">{(Number(form.detaylar[d.id]?.dogru || 0) - Number(form.detaylar[d.id]?.yanlis || 0) / 4).toFixed(2)}</output>
                    </div>
                    <small className="ders-question-limit">{d.question_count ? `Toplam ${d.question_count} soru` : 'Toplam soru sayısı tanımlanmadığı için bu ders kaydedilemez.'}</small>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={saving}>İptal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .deneme-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 16px;
        }

        .chart-card {
          padding: 24px;
        }

        .chart-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .chart-icon {
          color: var(--primary-500);
        }

        .deneme-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .deneme-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px dashed var(--border-light);
        }

        .deneme-yayin {
          font-weight: 700;
          font-size: 1.125rem;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .deneme-date {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .deneme-total {
          text-align: right;
          background: var(--primary-50);
          padding: 8px 16px;
          border-radius: var(--radius-md);
        }

        .deneme-total-label {
          font-size: 0.75rem;
          color: var(--primary-700);
          display: block;
          font-weight: 600;
        }

        .deneme-total-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--primary-600);
        }

        .deneme-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
        }

        .detail-ders {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .detail-nums {
          display: flex;
          gap: 16px;
          font-size: 0.8125rem;
        }

        .detail-d { color: var(--success); font-weight: 700; }
        .detail-y { color: var(--error); font-weight: 700; }
        .detail-b { color: var(--text-tertiary); font-weight: 600; }
        .detail-net { color: var(--primary-600); font-weight: 800; background: white; padding: 2px 8px; border-radius: 4px; box-shadow: var(--shadow-xs); }

        .btn-delete {
          color: var(--error);
        }
        
        .btn-delete:hover {
          background: var(--error-light);
          color: #B91C1C;
        }

        .ders-inputs {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 360px;
          overflow-y: auto;
          padding-right: 8px;
        }

        .ders-input-legend {
          padding: 0 12px 7px;
          display: grid;
          grid-template-columns: minmax(120px, 1fr) repeat(4, 56px);
          gap: 8px;
          color: var(--text-tertiary);
          font-size: .7rem;
          font-weight: 700;
          text-align: center;
        }
        .ders-input-legend span:first-child { text-align: left; }

        .ders-input-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          position: relative;
        }

        .ders-input-name {
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        .ders-input-fields {
          display: flex;
          gap: 8px;
        }
        
        .ders-input-mini {
          width: 56px;
          text-align: center;
          padding: 8px;
        }
        .ders-live-net, .ders-auto-blank { width: 56px; min-height: 38px; border-radius: 8px; display: grid; place-items: center; font-size: .75rem; font-weight: 800; }
        .ders-live-net { background: var(--primary-50); color: var(--primary-700); }
        .ders-auto-blank { border: 1px solid var(--border-light); background: var(--bg-primary); color: var(--text-secondary); }
        .ders-question-limit { position: absolute; left: 12px; bottom: 4px; color: var(--text-tertiary); font-size: .62rem; }

        @media (max-width: 768px) {
          .deneme-list {
            grid-template-columns: 1fr;
          }
          
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .ders-input-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .ders-input-name {
            width: 100%;
          }
          
          .ders-input-fields {
            width: 100%;
            justify-content: space-between;
          }
          .ders-input-legend { display: none; }
          
          .ders-input-mini, .ders-live-net, .ders-auto-blank { width: 23%; }
        }
      `}</style>
      <style jsx global>{`
        .chart-tooltip {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border-light);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
        }
        .chart-tooltip-title {
          font-weight: 700;
          font-size: 0.875rem;
          margin-bottom: 2px;
          color: var(--text-primary);
        }
        .chart-tooltip-desc {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin-bottom: 8px;
        }
        .chart-tooltip-val {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .chart-tooltip-val span {
          color: var(--primary-600);
          font-weight: 800;
        }
      `}</style>
    </motion.div>
  );
}
