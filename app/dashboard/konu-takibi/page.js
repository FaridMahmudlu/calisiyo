'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, PlayCircle, CheckCircle2, BookOpen, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import PageHeader from '@/components/ui/PageHeader';
import JourneyLoader from '@/components/ui/JourneyLoader';

const REALTIME_TABLES = ['konu_takibi'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function KonuTakibiPage() {
  const { profile, setError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const examTabs = profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'];

  const [activeTab, setActiveTab] = useState('TYT');
  const [dersler, setDersler] = useState([]);
  const [konular, setKonular] = useState({});
  const [takip, setTakip] = useState({});
  const [loading, setLoading] = useState(true);
  const [openDersId, setOpenDersId] = useState(null);
  const [search, setSearch] = useState('');
  const [pendingTopics, setPendingTopics] = useState(() => new Set());

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const sinavTuru = activeTab;

    const { data: dersData, error: courseError } = await supabase
      .from('dersler')
      .select('*')
      .eq('sinav_turu', sinavTuru)
      .eq('curriculum_year', Number(profile.yks_year || 2027))
      .contains('alan', [profile.alan_secimi])
      .order('sira');

    if (courseError) {
      setError('Ders ve konu verileri yüklenemedi. Lütfen tekrar dene.');
      setDersler([]);
      setKonular({});
      setTakip({});
      setLoading(false);
      return;
    }

    if (dersData) {
      setDersler(dersData);
      
      // Auto-open first subject if none is open
      if (dersData.length > 0) setOpenDersId((current) => current || dersData[0].id);

      const dersIds = dersData.map(d => d.id);
      const { data: konuData, error: topicError } = await supabase
        .from('konular')
        .select('*')
        .in('ders_id', dersIds)
        .order('sira');

      if (topicError) {
        setError('Konular yüklenemedi. Lütfen tekrar dene.');
        setKonular({});
        setTakip({});
        setLoading(false);
        return;
      }

      // Group konular by ders_id
      const grouped = {};
      (konuData || []).forEach(k => {
        if (!grouped[k.ders_id]) grouped[k.ders_id] = [];
        grouped[k.ders_id].push(k);
      });
      setKonular(grouped);

      // Load tracking data
      const konuIds = (konuData || []).map(k => k.id);
      if (konuIds.length > 0) {
        const { data: takipData, error: trackingError } = await supabase
          .from('konu_takibi')
          .select('*')
          .eq('user_id', profile.id)
          .in('konu_id', konuIds);

        if (trackingError) {
          setError('Konu ilerlemen yüklenemedi. Lütfen tekrar dene.');
          setTakip({});
          setLoading(false);
          return;
        }

        const takipMap = {};
        (takipData || []).forEach(t => {
          takipMap[t.konu_id] = t.durum;
        });
        setTakip(takipMap);
      } else {
        setTakip({});
      }
    }
    setLoading(false);
  }, [activeTab, profile, setError, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const refreshTracking = useCallback(async () => {
    if (!profile?.id) return;
    const { data, error: trackingError } = await supabase
      .from('konu_takibi')
      .select('konu_id,durum')
      .eq('user_id', profile.id);
    if (trackingError) return;
    setTakip(Object.fromEntries((data || []).map((item) => [item.konu_id, item.durum])));
  }, [profile, supabase]);

  useRealtimeRefresh({ tables: REALTIME_TABLES, userId: profile?.id, onChange: refreshTracking });

  async function handleStatusChange(konuId, newDurum) {
    if (pendingTopics.has(konuId)) return;
    const existing = takip[konuId];
    setPendingTopics((current) => new Set(current).add(konuId));
    setTakip((previous) => ({ ...previous, [konuId]: newDurum }));

    try {
      const result = existing
        ? await supabase
            .from('konu_takibi')
            .update({ durum: newDurum, updated_at: new Date().toISOString() })
            .eq('user_id', profile.id)
            .eq('konu_id', konuId)
        : await supabase
            .from('konu_takibi')
            .insert({ user_id: profile.id, konu_id: konuId, durum: newDurum });
      if (result.error) throw result.error;
    } catch (updateError) {
      setTakip((previous) => ({ ...previous, [konuId]: existing || 'baslanmadi' }));
      setError(`Konu durumu güncellenemedi: ${updateError.message}`);
    } finally {
      setPendingTopics((current) => {
        const next = new Set(current);
        next.delete(konuId);
        return next;
      });
    }
  }

  function getDersStats(dersId) {
    const dersKonular = konular[dersId] || [];
    const total = dersKonular.length;
    const tamamlanan = dersKonular.filter(k => takip[k.id] === 'tamamlandi').length;
    const devam = dersKonular.filter(k => takip[k.id] === 'devam_ediyor').length;
    const percent = total > 0 ? Math.round((tamamlanan / total) * 100) : 0;
    return { total, tamamlanan, devam, percent };
  }

  const durumLabels = {
    baslanmadi: { label: 'Başlanmadı', badge: 'badge-neutral', icon: <Circle size={14} /> },
    devam_ediyor: { label: 'Devam Ediyor', badge: 'badge-warning', icon: <PlayCircle size={14} /> },
    tamamlandi: { label: 'Tamamlandı', badge: 'badge-success', icon: <CheckCircle2 size={14} /> },
  };

  const durumCycle = ['baslanmadi', 'devam_ediyor', 'tamamlandi'];
  const allTopics = Object.values(konular).flat();
  const completedTotal = allTopics.filter((topic) => takip[topic.id] === 'tamamlandi').length;
  const inProgressTotal = allTopics.filter((topic) => takip[topic.id] === 'devam_ediyor').length;
  
  function toggleAccordion(id) {
    if (openDersId === id) {
      setOpenDersId(null);
    } else {
      setOpenDersId(id);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <PageHeader title="Konu Takibi" description="Alanına uygun konuları durumlarına göre takip et; tamamlanan konular için tekrarlar otomatik oluşur." />
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="study-segments">
          {examTabs.map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'is-active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <label className="topic-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Konu ara" /></label>
      </div>

      <div className="study-summary-grid"><div className="study-summary-item"><span className="summary-copy"><span>Toplam konu</span><strong>{allTopics.length}</strong></span></div><div className="study-summary-item"><span className="summary-copy"><span>Devam eden</span><strong>{inProgressTotal}</strong></span></div><div className="study-summary-item"><span className="summary-copy"><span>Tamamlanan</span><strong>{completedTotal}</strong></span></div></div>

      {loading ? (
        <JourneyLoader compact label="Konu ilerlemen hazırlanıyor" />
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="ders-list"
        >
          {dersler.length === 0 ? (
            <div className="card empty-state">
              <BookOpen size={48} className="empty-state-icon" />
              <div className="empty-state-title">Ders bulunamadı</div>
              <div className="empty-state-text">Seçtiğiniz alan ve sınav türüne ait ders bulunamadı. Lütfen profilinizden alanınızı kontrol edin.</div>
            </div>
          ) : (
            dersler.filter((course) => !search || (konular[course.id] || []).some((topic) => topic.ad.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')))).map((ders) => {
              const stats = getDersStats(ders.id);
              const dersKonular = (konular[ders.id] || []).filter((topic) => !search || topic.ad.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));
              const isOpen = openDersId === ders.id;

              return (
                <motion.div variants={itemVariants} key={ders.id} className="card ders-accordion">
                  <button
                    type="button"
                    className="ders-summary" 
                    onClick={() => toggleAccordion(ders.id)}
                    aria-expanded={isOpen}
                    aria-controls={`topics-${ders.id}`}
                  >
                    <div className="ders-info">
                      <div className="ders-icon-container" style={{ background: `${ders.renk}15`, color: ders.renk }}>
                        <span className="ders-icon">{ders.ikon}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="ders-name">{ders.ad}</span>
                        <span className="ders-stats-text">{stats.tamamlanan} / {stats.total} Konu</span>
                      </div>
                    </div>
                    <div className="ders-progress-wrapper">
                      <div className="progress-bar progress-bar-md" style={{ width: '120px' }}>
                        <div className="progress-bar-fill" style={{ width: `${stats.percent}%`, background: ders.renk }}></div>
                      </div>
                      <span className="ders-percent" style={{ color: ders.renk }}>{stats.percent}%</span>
                      <div className="accordion-icon">
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="konu-list-container"
                        id={`topics-${ders.id}`}
                      >
                        <div className="konu-list">
                          {dersKonular.length === 0 ? (
                            <div className="konu-empty">Bu derse ait konu bulunamadı.</div>
                          ) : (
                            dersKonular.map((konu) => {
                              const currentDurum = takip[konu.id] || 'baslanmadi';
                              const durumInfo = durumLabels[currentDurum];

                              return (
                                <div key={konu.id} className={`konu-item ${currentDurum === 'tamamlandi' ? 'konu-completed' : ''}`}>
                                  <span className="konu-name">{konu.ad}</span>
                                  <button
                                    className={`badge ${durumInfo.badge} status-btn ${pendingTopics.has(konu.id) ? 'is-saving' : ''}`}
                                    aria-label={`${konu.ad}: ${durumInfo.label}. Sonraki duruma geçir`}
                                    aria-busy={pendingTopics.has(konu.id)}
                                    disabled={pendingTopics.has(konu.id)}
                                    onClick={() => {
                                      const currentIdx = durumCycle.indexOf(currentDurum);
                                      const nextDurum = durumCycle[(currentIdx + 1) % durumCycle.length];
                                      handleStatusChange(konu.id, nextDurum);
                                    }}
                                  >
                                    {durumInfo.icon} {durumInfo.label}
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      <style jsx>{`
        .ders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ders-accordion {
          padding: 0;
          overflow: hidden;
          transition: all var(--transition-fast);
        }

        .ders-accordion:hover {
          border-color: var(--primary-300);
        }

        .ders-summary {
          width: 100%;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: left;
          padding: 20px 24px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }

        .ders-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ders-icon-container {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .ders-name {
          font-weight: 700;
          font-size: 1.125rem;
          color: var(--text-primary);
        }
        
        .ders-stats-text {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          font-weight: 500;
          margin-top: 2px;
        }

        .ders-progress-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ders-percent {
          font-size: 1rem;
          font-weight: 800;
          min-width: 44px;
          text-align: right;
        }
        
        .accordion-icon {
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .konu-list-container {
          overflow: hidden;
        }

        .konu-list {
          border-top: 1px solid var(--border-light);
          padding: 16px 24px 24px;
          background: var(--gray-50);
        }
        
        .konu-empty {
          color: var(--text-tertiary);
          font-size: 0.875rem;
          text-align: center;
          padding: 20px;
        }

        .konu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          margin-bottom: 8px;
          transition: all var(--transition-fast);
        }

        .konu-item:last-child {
          margin-bottom: 0;
        }
        
        .konu-item:hover {
          border-color: var(--primary-300);
          box-shadow: var(--shadow-sm);
        }
        
        .konu-completed {
          opacity: 0.8;
          background: var(--success-light);
          border-color: rgba(16, 185, 129, 0.2);
        }
        
        .konu-completed .konu-name {
          text-decoration: line-through;
          color: var(--text-tertiary);
        }

        .konu-name {
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        
        .status-btn {
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 0.75rem;
          transition: all var(--transition-fast);
        }
        
        .status-btn:hover {
          transform: scale(1.05);
        }

        .status-btn.is-saving { opacity: .72; }

        @media (max-width: 768px) {
          .ders-summary {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          
          .ders-progress-wrapper {
            width: 100%;
            justify-content: space-between;
          }
          
          .progress-bar {
            flex: 1;
            width: auto !important;
          }
          
          .konu-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .status-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </motion.div>
  );
}
