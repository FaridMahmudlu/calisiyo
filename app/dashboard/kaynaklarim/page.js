"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useUser } from "../layout";
import { createClient } from "@/lib/supabase/client";
import { getExamTabs, KITAP_TURLERI } from "@/lib/constants/alanlar";
import { useRealtimeRefresh } from "@/lib/hooks/useRealtimeRefresh";
import { createStudyImageUrls, uploadStudyImage } from "@/lib/supabase/storage";
import PageHeader from "@/components/ui/PageHeader";
import DataState from "@/components/ui/DataState";
import Modal from "@/components/ui/Modal";

const REALTIME_TABLES = ["kaynaklarim"];
const EMPTY_FORM = {
  ad: "",
  yayin: "",
  ders_id: "",
  sinav_turu: "TYT",
  kitap_turu: "soru_bankasi",
};

export default function KaynaklarimPage() {
  const { profile, setError: setGlobalError } = useUser();
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

  const infoFor = (resource) =>
    resource.kaynaklar_sistem
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

  const removeResource = async (resource) => {
    if (
      !window.confirm(
        "Bu kaynağı kitaplığından kaldırmak istediğine emin misin?",
      )
    )
      return;
    const { error: removeError } = await supabase
      .from("kaynaklarim")
      .delete()
      .eq("id", resource.id)
      .eq("user_id", profile.id);
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
    KITAP_TURLERI.find((type) => type.value === value)?.label ||
    value ||
    "Kitap";

  return (
    <div className="page resources-page">
      <PageHeader
        title="Kaynaklarım"
        description="Kullandığın kitap ve denemeleri yönet; planlarında gerçek kaynaklarını seç."
        actions={
          <button
            className="study-button study-button-primary"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={16} /> Kaynak ekle
          </button>
        }
      />
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
        <select
          value={bookType}
          onChange={(event) => setBookType(event.target.value)}
        >
          <option value="all">Tüm kitap türleri</option>
          {KITAP_TURLERI.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
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
                  className="book-cover"
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
                  </div>
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
              <select
                value={catalogId}
                onChange={(event) => setCatalogId(event.target.value)}
              >
                <option value="">Katalogdan seç</option>
                {catalog
                  .filter((item) => examTabs.includes(item.sinav_turu))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sinav_turu} · {item.ad} · {item.yayin}
                    </option>
                  ))}
              </select>
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
                <select
                  value={form.sinav_turu}
                  onChange={(event) =>
                    setForm({ ...form, sinav_turu: event.target.value })
                  }
                >
                  {examTabs.map((exam) => (
                    <option key={exam}>{exam}</option>
                  ))}
                </select>
              </label>
              <label>
                Ders
                <select
                  value={form.ders_id}
                  onChange={(event) =>
                    setForm({ ...form, ders_id: event.target.value })
                  }
                >
                  <option value="">Ders seç</option>
                  {courses
                    .filter((course) => course.sinav_turu === form.sinav_turu)
                    .map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.ad}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label>
              Kitap türü
              <select
                value={form.kitap_turu}
                onChange={(event) =>
                  setForm({ ...form, kitap_turu: event.target.value })
                }
              >
                {KITAP_TURLERI.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
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
    </div>
  );
}
