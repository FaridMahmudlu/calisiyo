"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BookOpen, CalendarDays, CirclePlay, Clock3, Crown, ExternalLink, ListVideo, Plus, Sparkles, Trash2 } from "lucide-react";
import { useUser } from "../layout";
import { createClient } from "@/lib/supabase/client";
import { getExamTabs, KITAP_TURLERI } from "@/lib/constants/alanlar";
import { useRealtimeRefresh } from "@/lib/hooks/useRealtimeRefresh";
import { createStudyImageUrls, uploadStudyImage } from "@/lib/supabase/storage";
import PageHeader from "@/components/ui/PageHeader";
import DataState from "@/components/ui/DataState";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import PremiumFeaturePrompt from "@/components/billing/PremiumFeaturePrompt";

const REALTIME_TABLES = ["kaynaklarim"];
const EMPTY_FORM = {
  ad: "",
  yayin: "",
  ders_id: "",
  sinav_turu: "TYT",
  kitap_turu: "soru_bankasi",
};
const TODAY_IN_TURKEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const YOUTUBE_CADENCE_OPTIONS = [
  { value: "daily", label: "Her gün", description: "İçerikleri ardışık günlere paylaştırır" },
  { value: "weekly", label: "Haftada 3 gün", description: "Pazartesi, çarşamba ve cumartesi planlar" },
];

export default function KaynaklarimPage() {
  const { profile, currentPlan, setError: setGlobalError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const examTabs = useMemo(
    () => (profile ? getExamTabs(profile.alan_secimi) : ["TYT", "AYT"]),
    [profile],
  );
  const [activeExam, setActiveExam] = useState("TYT");
  const [bookType, setBookType] = useState("all");
  const [resources, setResources] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [courses, setCourses] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [catalogId, setCatalogId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubePreview, setYoutubePreview] = useState(null);
  const [youtubeBusy, setYoutubeBusy] = useState("");
  const [youtubeError, setYoutubeError] = useState("");
  const [youtubeNotice, setYoutubeNotice] = useState("");
  const [premiumPrompt, setPremiumPrompt] = useState(false);
  const [youtubePlan, setYoutubePlan] = useState({
    courseId: "",
    startDate: TODAY_IN_TURKEY,
    cadence: "daily",
    dailyMinutes: "45",
    startItem: "1",
    startOffsetMinutes: "0",
  });

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError("");
    const [resourceResult, catalogResult, courseResult] = await Promise.all([
      supabase
        .from("kaynaklarim")
        .select("*, kaynaklar_sistem(*, dersler:ders_id(ad,renk,ikon))")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("kaynaklar_sistem")
        .select("*, dersler:ders_id(ad,renk,ikon)")
        .order("ad"),
      supabase
        .from("dersler")
        .select("*")
        .eq("curriculum_year", Number(profile.yks_year || 2027))
        .contains("alan", [profile.alan_secimi])
        .order("sira"),
    ]);
    const loadError =
      resourceResult.error || catalogResult.error || courseResult.error;
    if (loadError) setError(loadError.message);
    const rows = resourceResult.data || [];
    setResources(rows);
    setCatalog(catalogResult.data || []);
    setCourses(courseResult.data || []);
    const privatePaths = rows
      .map((row) => row.kapak_url)
      .filter((path) => path && !path.startsWith("http"));
    setImageUrls(await createStudyImageUrls(supabase, privatePaths));
    setLoading(false);
  }, [profile, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);
  useRealtimeRefresh({
    tables: REALTIME_TABLES,
    userId: profile?.id,
    onChange: loadData,
  });

  const infoFor = (resource) => {
    if (resource.resource_kind?.startsWith("youtube_")) {
      return {
        name: resource.custom_ad,
        publisher: resource.custom_yayin || "YouTube",
        exam: resource.source_metadata?.examType || "TYT",
        type: "video",
        course: courses.find((course) => course.id === resource.custom_ders_id),
        cover: resource.source_metadata?.thumbnailUrl,
        sourceUrl: resource.source_url,
        durationMinutes: resource.duration_minutes,
        itemCount: resource.item_count,
        youtube: true,
      };
    }
    return resource.kaynaklar_sistem
      ? {
          name: resource.kaynaklar_sistem.ad,
          publisher: resource.kaynaklar_sistem.yayin,
          exam: resource.kaynaklar_sistem.sinav_turu,
          type: resource.kaynaklar_sistem.kitap_turu,
          course: resource.kaynaklar_sistem.dersler,
          cover: resource.kaynaklar_sistem.kapak_url || resource.kapak_url,
        }
      : {
          name: resource.custom_ad,
          publisher: resource.custom_yayin,
          exam: resource.custom_sinav_turu,
          type: resource.custom_kitap_turu,
          course: courses.find(
            (course) => course.id === resource.custom_ders_id,
          ),
          cover: resource.kapak_url,
        };
  };

  const visibleResources = resources.filter((resource) => {
    const info = infoFor(resource);
    return (
      info.exam === activeExam && (bookType === "all" || info.type === bookType)
    );
  });

  const addCatalogResource = async () => {
    if (!catalogId) return;
    setSaving(true);
    const { error: insertError } = await supabase
      .from("kaynaklarim")
      .insert({ user_id: profile.id, kaynak_sistem_id: catalogId });
    setSaving(false);
    if (insertError)
      return setGlobalError(`Kaynak eklenemedi: ${insertError.message}`);
    setCatalogId("");
    setModalOpen(false);
    await loadData();
  };

  const addCustomResource = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const coverPath = coverFile
        ? await uploadStudyImage(
            supabase,
            profile.id,
            coverFile,
            "resource-covers",
          )
        : null;
      const { error: insertError } = await supabase
        .from("kaynaklarim")
        .insert({
          user_id: profile.id,
          custom_ad: form.ad.trim(),
          custom_yayin: form.yayin.trim(),
          custom_ders_id: form.ders_id || null,
          custom_sinav_turu: form.sinav_turu,
          custom_kitap_turu: form.kitap_turu,
          kapak_url: coverPath,
        });
      if (insertError) throw insertError;
      setForm(EMPTY_FORM);
      setCoverFile(null);
      setModalOpen(false);
      await loadData();
    } catch (saveError) {
      setGlobalError(`Kaynak eklenemedi: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const openYoutubePlanner = () => {
    setYoutubePlan((current) => ({ ...current, courseId: "" }));
    setYoutubeUrl("");
    setYoutubePreview(null);
    setYoutubeError("");
    setYoutubeOpen(true);
  };

  const analyzeYoutube = async (event) => {
    event?.preventDefault();
    if (!youtubeUrl.trim()) return;
    setYoutubeBusy("analyze");
    setYoutubeError("");
    try {
      const response = await fetch("/api/youtube/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "analyze", url: youtubeUrl.trim() }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "İçerik okunamadı.");
      setYoutubePreview(payload);
      setYoutubePlan((current) => ({ ...current, startItem: "1", startOffsetMinutes: "0" }));
    } catch (requestError) {
      setYoutubePreview(null);
      setYoutubeError(requestError.message || "YouTube içeriği okunamadı.");
    } finally {
      setYoutubeBusy("");
    }
  };

  const importYoutubePlan = async () => {
    setYoutubeBusy("import");
    setYoutubeError("");
    try {
      const response = await fetch("/api/youtube/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "import",
          url: youtubeUrl.trim(),
          ...youtubePlan,
          examType: activeExam,
          dailyMinutes: Number(youtubePlan.dailyMinutes),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Plan kaydedilemedi.");
      setYoutubeNotice(`${payload.result.tasksCreated} video gerçek günlük görevlerine eklendi.`);
      window.setTimeout(() => setYoutubeNotice(""), 5000);
      setYoutubeOpen(false);
      setYoutubePreview(null);
      setYoutubeUrl("");
      await loadData();
    } catch (requestError) {
      setYoutubeError(requestError.message || "Plan kaydedilemedi.");
    } finally {
      setYoutubeBusy("");
    }
  };

  const removeResource = async (resource) => {
    const isYoutube = resource.resource_kind?.startsWith("youtube_");
    if (
      !window.confirm(
        isYoutube
          ? "Bu YouTube kaynağı ve henüz tamamlanmamış video görevleri kaldırılacak. Tamamlanan çalışma geçmişin korunur. Devam edilsin mi?"
          : "Bu kaynağı kitaplığından kaldırmak istediğine emin misin?",
      )
    )
      return;
    const { error: removeError } = await supabase.rpc("remove_learning_resource", {
      p_resource_id: resource.id,
    });
    if (removeError)
      return setGlobalError(`Kaynak kaldırılamadı: ${removeError.message}`);
    if (resource.kapak_url)
      await supabase.storage.from("study-assets").remove([resource.kapak_url]);
    setResources((current) =>
      current.filter((item) => item.id !== resource.id),
    );
  };

  const coverUrl = (path) =>
    path?.startsWith("http") ? path : imageUrls[path];
  const typeLabel = (value) =>
    value === "video"
      ? "Video planı"
      :
    KITAP_TURLERI.find((type) => type.value === value)?.label ||
    value ||
    "Kitap";

  return (
    <div className="page resources-page">
      <PageHeader
        title="Kaynaklarım"
        description="Kullandığın kitap ve denemeleri yönet; planlarında gerçek kaynaklarını seç."
        actions={<>
          <button className="study-button youtube-plan-button" onClick={openYoutubePlanner}>
            <CirclePlay size={17} /> YouTube’dan planla
          </button>
          <button className="premium-inline-action" onClick={() => setPremiumPrompt(true)} title="Premium YouTube planı limitlerini gör">
            <Crown size={13} /> Premium limitleri
          </button>
          <button className="study-button study-button-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Kaynak ekle
          </button>
        </>}
      />
      {youtubeNotice && <div className="youtube-plan-notice" role="status"><Sparkles size={16} /> {youtubeNotice}</div>}
      <div className="resource-toolbar">
        <div className="study-segments">
          {examTabs.map((exam) => (
            <button
              key={exam}
              className={activeExam === exam ? "is-active" : ""}
              onClick={() => setActiveExam(exam)}
            >
              {exam}
            </button>
          ))}
        </div>
        <Select ariaLabel="Kitap türü filtresi" value={bookType} onChange={setBookType} options={[{ value: 'all', label: 'Tüm kitap türleri' }, ...KITAP_TURLERI.map((type) => ({ value: type.value, label: type.label }))]} />
        <span>{visibleResources.length} kaynak</span>
      </div>
      <DataState
        loading={loading}
        error={error}
        empty={!visibleResources.length}
        emptyTitle={`${activeExam} için kaynak yok`}
        emptyText="Sistem kataloğundan seçebilir veya kendi kaynağını ekleyebilirsin."
      >
        <section className="resource-shelf">
          {visibleResources.map((resource) => {
            const info = infoFor(resource);
            const url = coverUrl(info.cover);
            return (
              <article className="resource-book" key={resource.id}>
                <div
                  className={`book-cover${info.youtube ? " is-video" : ""}`}
                  style={{ borderColor: info.course?.renk || "#00a870" }}
                >
                  {url ? (
                    <Image src={url} alt={`${info.name} kapak görseli`} width={92} height={136} unoptimized />
                  ) : (
                    <span>
                      <BookOpen size={28} />
                      <small>{info.exam}</small>
                    </span>
                  )}
                </div>
                <div className="book-copy">
                  <strong>{info.name}</strong>
                  <span>{info.publisher}</span>
                  <div>
                    <em>{info.exam}</em>
                    {info.course && <em>{info.course.ad}</em>}
                    <em>{typeLabel(info.type)}</em>
                    {info.youtube && <em>{info.itemCount} video</em>}
                    {info.youtube && <em>{info.durationMinutes} dk</em>}
                  </div>
                  {info.youtube && <a className="resource-source-link" href={info.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> YouTube’da aç</a>}
                </div>
                <button
                  className="icon-button danger-icon"
                  onClick={() => removeResource(resource)}
                  aria-label="Kaynağı kaldır"
                >
                  <Trash2 size={16} />
                </button>
              </article>
            );
          })}
        </section>
      </DataState>
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title="Kaynak ekle"
      >
        <div className="study-segments modal-tabs">
          <button
            className={!customMode ? "is-active" : ""}
            onClick={() => setCustomMode(false)}
          >
            Sistem kataloğu
          </button>
          <button
            className={customMode ? "is-active" : ""}
            onClick={() => setCustomMode(true)}
          >
            Özel kaynak
          </button>
        </div>
        {!customMode ? (
          <div className="study-form">
            <label>
              Kaynak
              <Select ariaLabel="Kaynak" value={catalogId} onChange={setCatalogId} placeholder="Katalogdan seç" options={catalog.filter((item) => examTabs.includes(item.sinav_turu)).map((item) => ({ value: item.id, label: item.ad, description: `${item.sinav_turu} · ${item.yayin}` }))} searchable />
            </label>
            <div className="form-actions">
              <button
                className="study-button study-button-primary"
                onClick={addCatalogResource}
                disabled={!catalogId || saving}
              >
                {saving ? "Ekleniyor…" : "Kitaplığıma ekle"}
              </button>
            </div>
          </div>
        ) : (
          <form className="study-form" onSubmit={addCustomResource}>
            <label>
              Kitap adı
              <input
                value={form.ad}
                onChange={(event) =>
                  setForm({ ...form, ad: event.target.value })
                }
                required
              />
            </label>
            <label>
              Yayın
              <input
                value={form.yayin}
                onChange={(event) =>
                  setForm({ ...form, yayin: event.target.value })
                }
                required
              />
            </label>
            <div className="form-grid-2">
              <label>
                Sınav
                <Select ariaLabel="Sınav" value={form.sinav_turu} onChange={(value) => setForm({ ...form, sinav_turu: value, ders_id: '' })} options={examTabs.map((exam) => ({ value: exam, label: exam }))} />
              </label>
              <label>
                Ders
                <Select ariaLabel="Ders" value={form.ders_id} onChange={(value) => setForm({ ...form, ders_id: value })} placeholder="Ders seç" options={courses.filter((course) => course.sinav_turu === form.sinav_turu).map((course) => ({ value: course.id, label: course.ad }))} />
              </label>
            </div>
            <label>
              Kitap türü
              <Select ariaLabel="Kitap türü" value={form.kitap_turu} onChange={(value) => setForm({ ...form, kitap_turu: value })} options={KITAP_TURLERI.map((type) => ({ value: type.value, label: type.label }))} />
            </label>
            <label>
              Kapak görseli
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setCoverFile(event.target.files?.[0] || null)
                }
              />
            </label>
            <div className="form-actions">
              <button
                className="study-button study-button-primary"
                disabled={saving}
              >
                {saving ? "Ekleniyor…" : "Kaynağı ekle"}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={youtubeOpen}
        onClose={() => !youtubeBusy && setYoutubeOpen(false)}
        title="YouTube öğrenme planı"
        description="Video veya oynatma listesini gerçek günlük görevlerine dönüştür."
        size="lg"
      >
        <div className="youtube-planner">
          <form className="youtube-url-form" onSubmit={analyzeYoutube}>
            <label>
              <span>YouTube bağlantısı</span>
              <div><CirclePlay size={18} /><input type="url" value={youtubeUrl} onChange={(event) => { setYoutubeUrl(event.target.value); setYoutubePreview(null); }} placeholder="https://www.youtube.com/watch?v=..." required /><button disabled={youtubeBusy === "analyze"}>{youtubeBusy === "analyze" ? "Okunuyor…" : "İçeriği analiz et"}</button></div>
            </label>
          </form>
          {youtubeError && <div className="youtube-plan-error" role="alert">{youtubeError}</div>}
          {youtubePreview && <>
            <article className="youtube-preview-card">
              {youtubePreview.resource.thumbnailUrl ? <Image src={youtubePreview.resource.thumbnailUrl} alt="YouTube içerik kapağı" width={240} height={135} unoptimized /> : <span><CirclePlay size={30} /></span>}
              <div><small>{youtubePreview.resource.kind === "youtube_playlist" ? "Oynatma listesi" : "Video"}</small><strong>{youtubePreview.resource.title}</strong><p>{youtubePreview.resource.channelTitle}</p><div><span><ListVideo size={14} /> {youtubePreview.resource.itemCount} video</span><span><Clock3 size={14} /> {youtubePreview.resource.durationMinutes} dakika</span></div></div>
            </article>
            <section className="youtube-plan-settings">
              <header><div><Sparkles size={18} /><span><strong>Akıllı dağıtım</strong><small>Video sırası korunur; süre hedefini aşınca sonraki çalışma gününe geçer.</small></span></div></header>
              <div className="form-grid-2">
                <label>Ders<Select ariaLabel="YouTube planı dersi" value={youtubePlan.courseId} onChange={(value) => setYoutubePlan({ ...youtubePlan, courseId: value })} placeholder="Ders seç (isteğe bağlı)" options={courses.filter((course) => course.sinav_turu === activeExam).map((course) => ({ value: course.id, label: course.ad }))} /></label>
                <label>Başlangıç tarihi<input type="date" min={TODAY_IN_TURKEY} value={youtubePlan.startDate} onChange={(event) => setYoutubePlan({ ...youtubePlan, startDate: event.target.value })} /></label>
                <label>Çalışma ritmi<Select ariaLabel="YouTube çalışma ritmi" value={youtubePlan.cadence} onChange={(value) => setYoutubePlan({ ...youtubePlan, cadence: value })} options={YOUTUBE_CADENCE_OPTIONS} /></label>
                <label>Günlük video süresi<input type="number" min="15" max="360" step="5" value={youtubePlan.dailyMinutes} onChange={(event) => setYoutubePlan({ ...youtubePlan, dailyMinutes: event.target.value })} /><small>15–360 dakika</small></label>
                <label>Devam edilecek video<input type="number" min="1" max={youtubePreview.resource.itemCount} step="1" value={youtubePlan.startItem} onChange={(event) => setYoutubePlan({ ...youtubePlan, startItem: event.target.value })} /><small>1–{youtubePreview.resource.itemCount}. video</small></label>
                <label>Videodaki dakika<input type="number" min="0" max="1440" step="1" value={youtubePlan.startOffsetMinutes} onChange={(event) => setYoutubePlan({ ...youtubePlan, startOffsetMinutes: event.target.value })} /><small>Baştan başlamak için 0</small></label>
              </div>
              <div className="youtube-plan-summary"><CalendarDays size={17} /><span><strong>Yaklaşık {Math.max(1, Math.ceil(youtubePreview.resource.durationMinutes / Math.max(15, Number(youtubePlan.dailyMinutes) || 15)))} çalışma oturumu</strong><small>Kaynak ve bütün görevler tek işlemde, kendi hesabına kaydedilir.</small></span></div>
              <button className="study-button study-button-primary youtube-import-button" onClick={importYoutubePlan} disabled={youtubeBusy === "import" || !youtubePlan.startDate}>{youtubeBusy === "import" ? "Plan hazırlanıyor…" : <><Sparkles size={16} /> Planı oluştur ve görevlerime ekle</>}</button>
            </section>
          </>}
        </div>
      </Modal>
      <PremiumFeaturePrompt open={premiumPrompt} onClose={() => setPremiumPrompt(false)} feature="YouTube çalışma planı limitleri" requiredPlan="calisiyo plus" currentPlan={currentPlan?.name || "calisiyo ücretsiz"} description="calisiyo ücretsiz planında ayda 2 YouTube içeriğini görevlere dönüştürebilirsin. Plus bu aylık limiti genişletir." benefits={["Plus ile ayda 30 YouTube planı", "Kaldığın video ve dakikadan devam et", "Video ve oynatma listelerini günlük görevlere böl"]} />
    </div>
  );
}
