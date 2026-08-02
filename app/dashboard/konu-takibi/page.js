'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../layout';
import { createClient } from '@/lib/supabase/client';
import { getExamTabs } from '@/lib/constants/alanlar';

export default function KonuTakibiPage() {
  const { profile } = useUser();
  const supabase = createClient();
  const examTabs = profile ? getExamTabs(profile.alan_secimi) : ['TYT', 'AYT'];

  const [activeTab, setActiveTab] = useState('TYT');
  const [dersler, setDersler] = useState([]);
  const [konular, setKonular] = useState({});
  const [takip, setTakip] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile, activeTab]);

  async function loadData() {
    setLoading(true);
    const sinavTuru = activeTab;

    const { data: dersData } = await supabase
      .from('dersler')
      .select('*')
      .eq('sinav_turu', sinavTuru)
      .contains('alan', [profile.alan_secimi])
      .order('sira');

    if (dersData) {
      setDersler(dersData);

      const dersIds = dersData.map(d => d.id);
      const { data: konuData } = await supabase
        .from('konular')
        .select('*')
        .in('ders_id', dersIds)
        .order('sira');

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
        const { data: takipData } = await supabase
          .from('konu_takibi')
          .select('*')
          .eq('user_id', profile.id)
          .in('konu_id', konuIds);

        const takipMap = {};
        (takipData || []).forEach(t => {
          takipMap[t.konu_id] = t.durum;
        });
        setTakip(takipMap);
      }
    }
    setLoading(false);
  }

  async function handleStatusChange(konuId, newDurum) {
    const existing = takip[konuId];

    if (existing) {
      await supabase
        .from('konu_takibi')
        .update({ durum: newDurum, updated_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .eq('konu_id', konuId);
    } else {
      await supabase
        .from('konu_takibi')
        .insert({ user_id: profile.id, konu_id: konuId, durum: newDurum });
    }

    setTakip({ ...takip, [konuId]: newDurum });
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
    baslanmadi: { label: 'Başlanmadı', badge: 'badge-neutral', icon: '○' },
    devam_ediyor: { label: 'Devam', badge: 'badge-warning', icon: '◐' },
    tamamlandi: { label: 'Tamam', badge: 'badge-success', icon: '✓' },
  };

  const durumCycle = ['baslanmadi', 'devam_ediyor', 'tamamlandi'];

  return (
    <div className="page animate-fade-in">
      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '24px' }}>
        {examTabs.map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : (
        <div className="ders-list">
          {dersler.map((ders) => {
            const stats = getDersStats(ders.id);
            const dersKonular = konular[ders.id] || [];

            return (
              <details key={ders.id} className="ders-accordion card">
                <summary className="ders-summary">
                  <div className="ders-info">
                    <span className="ders-icon">{ders.ikon}</span>
                    <span className="ders-name">{ders.ad}</span>
                    <span className="badge badge-neutral">{stats.tamamlanan}/{stats.total}</span>
                  </div>
                  <div className="ders-progress-wrapper">
                    <div className="progress-bar progress-bar-sm" style={{ flex: 1 }}>
                      <div className="progress-bar-fill" style={{ width: `${stats.percent}%` }}></div>
                    </div>
                    <span className="ders-percent">{stats.percent}%</span>
                  </div>
                </summary>
                <div className="konu-list">
                  {dersKonular.map((konu) => {
                    const currentDurum = takip[konu.id] || 'baslanmadi';
                    const durumInfo = durumLabels[currentDurum];

                    return (
                      <div key={konu.id} className="konu-item">
                        <span className="konu-name">{konu.ad}</span>
                        <button
                          className={`badge ${durumInfo.badge}`}
                          onClick={() => {
                            const currentIdx = durumCycle.indexOf(currentDurum);
                            const nextDurum = durumCycle[(currentIdx + 1) % durumCycle.length];
                            handleStatusChange(konu.id, nextDurum);
                          }}
                          style={{ cursor: 'pointer', border: 'none' }}
                        >
                          {durumInfo.icon} {durumInfo.label}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .ders-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ders-accordion {
          padding: 0;
          overflow: hidden;
        }

        .ders-summary {
          padding: 18px 20px;
          cursor: pointer;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ders-summary::-webkit-details-marker {
          display: none;
        }

        .ders-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ders-icon {
          font-size: 1.25rem;
        }

        .ders-name {
          font-weight: 600;
          font-size: 0.9375rem;
          flex: 1;
        }

        .ders-progress-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ders-percent {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--primary-600);
          min-width: 36px;
          text-align: right;
        }

        .konu-list {
          border-top: 1px solid var(--border-light);
          padding: 8px 20px 16px;
        }

        .konu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid var(--gray-100);
        }

        .konu-item:last-child {
          border-bottom: none;
        }

        .konu-name {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
