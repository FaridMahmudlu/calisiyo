'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookCheck, Brain, CalendarCheck2, ChevronRight, Clock3,
  Medal, Sparkles, Target, Trophy,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../layout';
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh';
import PageHeader from '@/components/ui/PageHeader';
import DataState from '@/components/ui/DataState';
import './progression.css';

const EVENT_META = {
  task_completed: { label: 'Program görevi', icon: CalendarCheck2, tone: 'green' },
  review_completed: { label: 'Planlı tekrar', icon: Brain, tone: 'violet' },
  exam_added: { label: 'Deneme kaydı', icon: Target, tone: 'orange' },
  topic_completed: { label: 'Konu tamamlandı', icon: BookCheck, tone: 'blue' },
  daily_focus: { label: '30 dakika odağı', icon: Clock3, tone: 'teal' },
};

const levelThreshold = (level) => 25 * Math.max(level - 1, 0) * (level + 8);

const levelTitle = (level) => {
  if (level >= 30) return 'Ustalık Yolunda';
  if (level >= 20) return 'Sınava Hazır';
  if (level >= 15) return 'İstikrarlı Öğrenci';
  if (level >= 10) return 'Düzenli Öğrenci';
  if (level >= 6) return 'Odaklı Öğrenci';
  if (level >= 3) return 'Rutin Kurucu';
  return 'Yeni Başlangıç';
};

const formatEventDate = (value) => new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

export default function ProgressionPage() {
  const { user, reloadAccount } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProgress = useCallback(async () => {
    if (!user?.id) return;
    const { data, error: progressError } = await supabase.rpc('get_my_progress');
    if (progressError) {
      setError('Gelişim bilgilerin şu anda yüklenemiyor. Lütfen tekrar dene.');
      setLoading(false);
      return;
    }
    setProgress(data);
    setError('');
    setLoading(false);
    reloadAccount?.();
  }, [reloadAccount, supabase, user?.id]);

  useEffect(() => {
    const timer = setTimeout(loadProgress, 0);
    return () => clearTimeout(timer);
  }, [loadProgress]);

  const realtimeTables = useMemo(() => ['xp_events'], []);
  useRealtimeRefresh({ tables: realtimeTables, userId: user?.id, onChange: loadProgress });

  const breakdown = useMemo(() => Object.entries(progress?.breakdown || {})
    .map(([type, value]) => ({ type, value: Number(value || 0), ...(EVENT_META[type] || {}) }))
    .sort((a, b) => b.value - a.value), [progress?.breakdown]);
  const maxBreakdown = Math.max(1, ...breakdown.map((item) => item.value));

  const milestones = useMemo(() => {
    const current = progress?.level || 1;
    return [current + 1, current + 2, current + 3].map((level) => ({
      level,
      title: levelTitle(level),
      threshold: levelThreshold(level),
      remaining: Math.max(0, levelThreshold(level) - Number(progress?.totalXp || 0)),
    }));
  }, [progress?.level, progress?.totalXp]);

  return (
    <div className="progression-page">
      <PageHeader
        eyebrow="Gelişim"
        title="Çalışmanın karşılığını görünür kıl"
        description="Seviyen yalnızca gerçek çalışma hareketlerinden ilerler. Tekrarlanan tıklamalar veya silinen kayıtlar XP kazandırmaz."
      />

      <DataState loading={loading} error={error} empty={!progress}>
        {progress && (
          <>
            <section className="progression-hero study-panel">
              <div className="level-orbit" style={{ '--level-progress': `${progress.progressPercent || 0}%` }}>
                <span><Trophy size={25} /></span>
                <strong>{progress.level}</strong>
                <small>SEVİYE</small>
              </div>
              <div className="progression-hero-copy">
                <span className="level-kicker"><Sparkles size={15} /> {progress.title}</span>
                <h2>{Number(progress.totalXp || 0).toLocaleString('tr-TR')} toplam XP</h2>
                <p>Bir sonraki seviyeye <strong>{Number(progress.xpToNext || 0).toLocaleString('tr-TR')} XP</strong> kaldı.</p>
                <div className="hero-progress-track" aria-label={`Seviye ilerlemesi yüzde ${progress.progressPercent || 0}`}>
                  <i style={{ width: `${Math.min(100, Math.max(0, progress.progressPercent || 0))}%` }} />
                </div>
                <div className="hero-progress-labels"><span>{progress.currentLevelXp} XP</span><span>{progress.currentLevelSize} XP</span></div>
              </div>
              <div className="progression-principle">
                <Medal size={20} />
                <strong>Adil ilerleme</strong>
                <span>XP, kayıtların durumuyla birlikte güncellenir. Bir hareket geri alınırsa ona ait XP de geri alınır.</span>
              </div>
            </section>

            <section className="progression-grid">
              <article className="progression-breakdown study-panel">
                <header><div><span>XP dağılımı</span><h2>Seni ileri taşıyan alışkanlıklar</h2></div><strong>{breakdown.length} aktif kaynak</strong></header>
                {breakdown.length === 0 ? (
                  <div className="progression-empty"><Trophy size={25} /><strong>İlk XP’ni kazanmaya hazırsın</strong><span>Bugünkü programından bir görevi tamamlayarak başlayabilirsin.</span></div>
                ) : (
                  <div className="breakdown-list">
                    {breakdown.map((item) => {
                      const Icon = item.icon || Sparkles;
                      return (
                        <div key={item.type} className={`breakdown-row is-${item.tone || 'green'}`}>
                          <span className="breakdown-icon"><Icon size={17} /></span>
                          <div><strong>{item.label || item.type}</strong><i><b style={{ width: `${(item.value / maxBreakdown) * 100}%` }} /></i></div>
                          <em>{item.value} XP</em>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="milestone-panel study-panel">
                <header><span>Yol haritası</span><h2>Sıradaki seviyeler</h2></header>
                <div className="milestone-list">
                  {milestones.map((item, index) => (
                    <div key={item.level} className={index === 0 ? 'is-next' : ''}>
                      <span>{item.level}</span>
                      <div><strong>{item.title}</strong><small>{item.threshold.toLocaleString('tr-TR')} toplam XP</small></div>
                      <em>{item.remaining.toLocaleString('tr-TR')} kaldı</em>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="progression-lower-grid">
              <article className="xp-rules study-panel">
                <header><span>XP kuralları</span><h2>Her puanın gerçek bir karşılığı var</h2></header>
                <div>
                  {(progress.rules || []).map((rule) => {
                    const meta = EVENT_META[rule.type] || {};
                    const Icon = meta.icon || Sparkles;
                    return (
                      <article key={rule.type}>
                        <span className={`rule-icon is-${meta.tone || 'green'}`}><Icon size={18} /></span>
                        <div><strong>{rule.label}</strong><small>Bir kez, gerçek kayıt üzerinden</small></div>
                        <em>+{rule.xp} XP</em>
                      </article>
                    );
                  })}
                </div>
              </article>

              <article className="xp-history study-panel">
                <header><span>Son hareketler</span><h2>XP günlüğün</h2></header>
                {(progress.recentEvents || []).length === 0 ? (
                  <div className="progression-empty compact"><Clock3 size={22} /><strong>Henüz hareket yok</strong><span>Kazandığın XP burada zaman sırasıyla görünür.</span></div>
                ) : (
                  <div className="xp-history-list">
                    {progress.recentEvents.map((event) => {
                      const meta = EVENT_META[event.event_type] || {};
                      const Icon = meta.icon || Sparkles;
                      return (
                        <div key={event.id}>
                          <span className={`history-icon is-${meta.tone || 'green'}`}><Icon size={15} /></span>
                          <div><strong>{meta.label || event.event_type}</strong><small>{formatEventDate(event.created_at)}</small></div>
                          <em>+{event.xp_amount} XP</em><ChevronRight size={15} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          </>
        )}
      </DataState>
    </div>
  );
}
