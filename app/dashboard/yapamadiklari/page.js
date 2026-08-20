"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, Edit3, FileImage, Images, ListPlus, Plus, Trash2, X } from "lucide-react";
import { useUser } from "../layout";
import { createClient } from "@/lib/supabase/client";
import { getExamTabs } from "@/lib/constants/alanlar";
import { formatDate } from "@/lib/utils/date";
import { useRealtimeRefresh } from "@/lib/hooks/useRealtimeRefresh";
import { createStudyImageUrls, uploadStudyImage } from "@/lib/supabase/storage";
import PageHeader from "@/components/ui/PageHeader";
import DataState from "@/components/ui/DataState";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";

const EMPTY_FORM = {
  ders_id: "",
  konu: "",
  kaynak: "",
  sayfa: "",
  soru_no: "",
  foto_url: "",
};
const EMPTY_BULK_FORM = { ders_id: "", konu: "", kaynak: "" };
const REALTIME_TABLES = ["yapamadiklari", "yapamadiklari_gorseller"];
const MAX_IMAGES_PER_QUESTION = 6;

function questionImages(question) {
  const related = [...(question.yapamadiklari_gorseller || [])]
    .sort((left, right) => left.sort_order - right.sort_order);
  if (related.length) return related;
  return question.foto_url
    ? [{ id: `legacy-${question.id}`, storage_path: question.foto_url, sort_order: 0, legacy: true }]
    : [];
}

function LocalImagePreview({ file, index, onRemove }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <div className="bulk-image-preview"><Image src={url} alt={`${index + 1}. seçilen soru görseli`} width={180} height={130} unoptimized /><span>{index + 1}</span><button type="button" onClick={onRemove} aria-label={`${index + 1}. görseli kaldır`}><X size={14} /></button></div>;
}

export default function YapamadiklariPage() {
  const { profile, setError: setGlobalError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const examTabs = useMemo(
    () => (profile ? getExamTabs(profile.alan_secimi) : ["TYT", "AYT"]),
    [profile],
  );
  const [activeExam, setActiveExam] = useState("TYT");
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState(() => new Set());
  const [viewer, setViewer] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(EMPTY_BULK_FORM);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError("");
    const [questionResult, courseResult] = await Promise.all([
      supabase
        .from("yapamadiklari")
        .select("*, dersler(ad, renk, ikon), yapamadiklari_gorseller(id,storage_path,sort_order)")
        .eq("user_id", profile.id)
        .eq("sinav_turu", activeExam)
        .order("created_at", { ascending: false }),
      supabase
        .from("dersler")
        .select("*")
        .eq("sinav_turu", activeExam)
        .eq("curriculum_year", Number(profile.yks_year || 2027))
        .contains("alan", [profile.alan_secimi])
        .order("sira"),
    ]);
    const loadError = questionResult.error || courseResult.error;
    if (loadError) setError("Soru kayıtların yüklenemedi. Lütfen tekrar dene.");
    const rows = questionResult.data || [];
    setQuestions(rows);
    setCourses(courseResult.data || []);
    setImageUrls(
      await createStudyImageUrls(
        supabase,
        rows.flatMap((row) => questionImages(row).map((image) => image.storage_path)),
      ),
    );
    setLoading(false);
  }, [activeExam, profile, supabase]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);
  useRealtimeRefresh({
    tables: REALTIME_TABLES,
    userId: profile?.id,
    onChange: loadData,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFiles([]);
    setRemovedImageIds(new Set());
    setModalOpen(true);
  };
  const openEdit = (question) => {
    setEditing(question);
    setForm({
      ders_id: question.ders_id || "",
      konu: question.konu || "",
      kaynak: question.kaynak || "",
      sayfa: question.sayfa?.toString() || "",
      soru_no: question.soru_no || "",
      foto_url: question.foto_url || "",
    });
    setFiles([]);
    setRemovedImageIds(new Set());
    setModalOpen(true);
  };

  const saveQuestion = async (event) => {
    event.preventDefault();
    if (!form.ders_id) {
      setGlobalError("Soru kaydı için bir ders seçmelisin.");
      return;
    }
    const existingImages = editing
      ? questionImages(editing).filter((image) => !removedImageIds.has(image.id))
      : [];
    if (existingImages.length + files.length > MAX_IMAGES_PER_QUESTION) {
      setGlobalError(`Bir soruya en fazla ${MAX_IMAGES_PER_QUESTION} görsel ekleyebilirsin.`);
      return;
    }
    setSaving(true);
    const uploadedPaths = [];
    try {
      for (const imageFile of files) {
        uploadedPaths.push(await uploadStudyImage(supabase, profile.id, imageFile, "wrong-questions"));
      }
      const allPaths = [...existingImages.map((image) => image.storage_path), ...uploadedPaths];
      const { error: persistError } = await supabase.rpc("save_wrong_question_with_images", {
        p_question_id: editing?.id || null,
        p_exam_type: activeExam,
        p_course_id: form.ders_id,
        p_topic: form.konu.trim(),
        p_source: form.kaynak.trim(),
        p_page: form.sayfa ? Number(form.sayfa) : null,
        p_question_number: form.soru_no.trim(),
        p_image_paths: allPaths,
      });
      if (persistError) throw persistError;

      const removedPaths = editing
        ? questionImages(editing).filter((image) => removedImageIds.has(image.id)).map((image) => image.storage_path)
        : [];
      if (removedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from("study-assets").remove(removedPaths);
        if (cleanupError) setGlobalError("Soru güncellendi; kaldırılan eski görsel depodan temizlenemedi.");
      }
      setModalOpen(false);
      await loadData();
    } catch {
      let cleanupFailed = false;
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from("study-assets").remove(uploadedPaths);
        cleanupFailed = Boolean(cleanupError);
      }
      setGlobalError(cleanupFailed
        ? "Soru kaydedilemedi ve yüklenen bazı görseller temizlenemedi. Lütfen destekle iletişime geç."
        : "Soru kaydedilemedi. Bilgileri kontrol edip tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSolved = async (question) => {
    const next = !question.cozuldu;
    setQuestions((current) =>
      current.map((item) =>
        item.id === question.id ? { ...item, cozuldu: next } : item,
      ),
    );
    const { error: updateError } = await supabase
      .from("yapamadiklari")
      .update({ cozuldu: next })
      .eq("id", question.id)
      .eq("user_id", profile.id);
    if (updateError) {
      setQuestions((current) =>
        current.map((item) => (item.id === question.id ? question : item)),
      );
      setGlobalError("Soru durumu güncellenemedi. Lütfen tekrar dene.");
    }
  };

  const removeQuestion = async (question) => {
    if (!window.confirm("Bu soru kaydını silmek istediğine emin misin?"))
      return;
    const { error: deleteError } = await supabase
      .from("yapamadiklari")
      .delete()
      .eq("id", question.id)
      .eq("user_id", profile.id);
    if (deleteError)
      return setGlobalError("Soru silinemedi. Lütfen tekrar dene.");
    const paths = questionImages(question).map((image) => image.storage_path);
    if (paths.length) {
      const { error: cleanupError } = await supabase.storage.from("study-assets").remove(paths);
      if (cleanupError) setGlobalError("Soru silindi; eski görseller depodan temizlenemedi.");
    }
    setQuestions((current) =>
      current.filter((item) => item.id !== question.id),
    );
  };

  const saveBulkQuestions = async (event) => {
    event.preventDefault();
    if (!bulkForm.ders_id) return setGlobalError("Toplu soru kaydı için bir ders seçmelisin.");
    if (!bulkFiles.length) return setGlobalError("En az bir soru görseli seçmelisin.");
    if (bulkFiles.length > 50) return setGlobalError("Tek seferde en fazla 50 soru görseli ekleyebilirsin.");
    setSaving(true);
    const uploadedPaths = [];
    try {
      for (const imageFile of bulkFiles) {
        uploadedPaths.push(await uploadStudyImage(supabase, profile.id, imageFile, "wrong-questions"));
      }
      const { error: bulkError } = await supabase.rpc("create_wrong_questions_from_images", {
        p_exam_type: activeExam,
        p_course_id: bulkForm.ders_id,
        p_topic: bulkForm.konu.trim(),
        p_source: bulkForm.kaynak.trim(),
        p_image_paths: uploadedPaths,
      });
      if (bulkError) throw bulkError;
      setBulkOpen(false);
      setBulkForm(EMPTY_BULK_FORM);
      setBulkFiles([]);
      await loadData();
    } catch {
      let cleanupFailed = false;
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from("study-assets").remove(uploadedPaths);
        cleanupFailed = Boolean(cleanupError);
      }
      setGlobalError(cleanupFailed
        ? "Sorular eklenemedi ve yüklenen bazı görseller temizlenemedi. Lütfen destekle iletişime geç."
        : "Sorular toplu eklenemedi. Bilgileri kontrol edip tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  const viewerImages = viewer ? questionImages(viewer.question) : [];
  const viewerImage = viewerImages[viewer?.index || 0];
  const moveViewer = (direction) => {
    if (!viewerImages.length) return;
    setViewer((current) => ({
      ...current,
      index: (current.index + direction + viewerImages.length) % viewerImages.length,
    }));
  };

  return (
    <div className="page wrong-page">
      <PageHeader
        title="Yapamadığım Sorular"
        description="Zorlandığın soruları görseli ve kaynak bilgisiyle kaydet; çözdükçe işaretle."
        actions={<div className="wrong-head-actions">
          <button className="study-button" onClick={() => { setBulkForm({ ...EMPTY_BULK_FORM, ders_id: courses[0]?.id || "" }); setBulkFiles([]); setBulkOpen(true); }}><ListPlus size={16} /> Toplu ekle</button>
          <button className="study-button study-button-primary" onClick={openCreate}><Plus size={16} /> Soru ekle</button>
        </div>}
      />
      <div className="study-segments content-tabs">
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
      <DataState
        loading={loading}
        error={error}
        empty={!questions.length}
        emptyTitle={`${activeExam} için soru kaydın yok`}
        emptyText="İlk yapamadığın soruyu görseli ve kaynak bilgisiyle ekleyebilirsin."
      >
        <div className="data-table-wrap study-panel">
          <table className="study-table">
            <thead>
              <tr>
                <th>Görsel</th>
                <th>Ders / Konu</th>
                <th>Kaynak</th>
                <th>Sayfa / Soru</th>
                <th>Tarih</th>
                <th>Durum</th>
                <th>
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr
                  key={question.id}
                  className={question.cozuldu ? "is-muted" : ""}
                >
                  <td>
                    {imageUrls[questionImages(question)[0]?.storage_path] ? (
                      <button className="question-thumb-button" onClick={() => setViewer({ question, index: 0 })} aria-label="Soru görsellerini büyüt">
                        <Image
                          className="question-thumb"
                          src={imageUrls[questionImages(question)[0].storage_path]}
                          alt="Soru görseli"
                          width={58}
                          height={46}
                          unoptimized
                        />
                        {questionImages(question).length > 1 && <span><Images size={11} /> {questionImages(question).length}</span>}
                      </button>
                    ) : (
                      <span className="image-placeholder">
                        <FileImage size={20} />
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>
                      {question.dersler?.ad || "Ders belirtilmedi"}
                    </strong>
                    <span>{question.konu || "Konu belirtilmedi"}</span>
                  </td>
                  <td>{question.kaynak || "—"}</td>
                  <td>
                    Sayfa {question.sayfa || "—"} · Soru{" "}
                    {question.soru_no || "—"}
                  </td>
                  <td>{formatDate(question.created_at)}</td>
                  <td>
                    <button
                      className={`status-button ${question.cozuldu ? "is-done" : ""}`}
                      onClick={() => toggleSolved(question)}
                    >
                      {question.cozuldu && <Check size={14} />}
                      {question.cozuldu ? "Çözüldü" : "Çözülmedi"}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        onClick={() => openEdit(question)}
                        aria-label="Soruyu düzenle"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="icon-button danger-icon"
                        onClick={() => removeQuestion(question)}
                        aria-label="Soruyu sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Soru kaydını düzenle" : "Yeni soru kaydı"}
      >
        <form className="study-form" onSubmit={saveQuestion}>
          <label>
            Ders
            <Select ariaLabel="Ders" value={form.ders_id} onChange={(value) => setForm({ ...form, ders_id: value })} placeholder="Ders seç" options={courses.map((course) => ({ value: course.id, label: course.ad }))} />
          </label>
          <label>
            Konu
            <input
              value={form.konu}
              onChange={(event) =>
                setForm({ ...form, konu: event.target.value })
              }
            />
          </label>
          <label>
            Kaynak
            <input
              value={form.kaynak}
              onChange={(event) =>
                setForm({ ...form, kaynak: event.target.value })
              }
              placeholder="Kitap veya deneme adı"
            />
          </label>
          <div className="form-grid-2">
            <label>
              Sayfa
              <input
                type="number"
                min="1"
                value={form.sayfa}
                onChange={(event) =>
                  setForm({ ...form, sayfa: event.target.value })
                }
              />
            </label>
            <label>
              Soru no
              <input
                value={form.soru_no}
                onChange={(event) =>
                  setForm({ ...form, soru_no: event.target.value })
                }
              />
            </label>
          </div>
          {editing && questionImages(editing).length > 0 && <div className="existing-question-images" aria-label="Kayıtlı soru görselleri">
            {questionImages(editing).map((image, index) => !removedImageIds.has(image.id) && <div key={image.id}>
              {imageUrls[image.storage_path] && <Image src={imageUrls[image.storage_path]} alt={`Soru görseli ${index + 1}`} width={92} height={72} unoptimized />}
              <button type="button" onClick={() => setRemovedImageIds((current) => new Set(current).add(image.id))} aria-label={`${index + 1}. görseli kaldır`}><X size={14} /></button>
            </div>)}
          </div>}
          <label>
            Soru görselleri <small>En fazla {MAX_IMAGES_PER_QUESTION} görsel</small>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, MAX_IMAGES_PER_QUESTION))}
            />
          </label>
          {files.length > 0 && <div className="selected-file-list">{files.map((imageFile) => <span key={`${imageFile.name}-${imageFile.lastModified}`}><FileImage size={13} /> {imageFile.name}</span>)}</div>}
          <div className="form-actions">
            <button
              type="button"
              className="study-button"
              onClick={() => setModalOpen(false)}
            >
              İptal
            </button>
            <button
              className="study-button study-button-primary"
              disabled={saving}
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={bulkOpen} onClose={() => !saving && setBulkOpen(false)} title="Soruları görsellerle toplu ekle" description="Her görsel ayrı bir soru kaydı olur; ders, konu ve kaynak bilgisi hepsine uygulanır." size="lg">
        <form className="study-form" onSubmit={saveBulkQuestions}>
          <div className="form-grid-2">
            <label>Ders<Select ariaLabel="Toplu soru dersi" value={bulkForm.ders_id} onChange={(value) => setBulkForm({ ...bulkForm, ders_id: value })} placeholder="Ders seç" options={courses.map((course) => ({ value: course.id, label: course.ad }))} /></label>
            <label>Konu<input value={bulkForm.konu} onChange={(event) => setBulkForm({ ...bulkForm, konu: event.target.value })} /></label>
          </div>
          <label>Kaynak<input value={bulkForm.kaynak} onChange={(event) => setBulkForm({ ...bulkForm, kaynak: event.target.value })} placeholder="Kitap veya deneme adı" /></label>
          <label>Soru görselleri <small>JPG, PNG veya WebP · en fazla 50 görsel</small><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => setBulkFiles(Array.from(event.target.files || []).slice(0, 50))} /></label>
          {bulkFiles.length > 0 ? <div className="bulk-image-grid" aria-label="Seçilen soru görselleri">{bulkFiles.map((file, index) => <LocalImagePreview key={`${file.name}-${file.lastModified}-${index}`} file={file} index={index} onRemove={() => setBulkFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div> : <div className="bulk-image-empty"><Images size={24} /><span>Soru fotoğraflarını seç; kaydetmeden önce burada kontrol edebilirsin.</span></div>}
          <p className="bulk-question-help">Bir görsel bir soru kaydı olarak oluşturulur. Ayrıntıları daha sonra tekli düzenleme ekranından değiştirebilirsin.</p>
          <div className="form-actions"><button type="button" className="study-button" onClick={() => setBulkOpen(false)}>İptal</button><button className="study-button study-button-primary" disabled={saving || !bulkFiles.length}>{saving ? `Yükleniyor (${bulkFiles.length})…` : `${bulkFiles.length || ''} soruyu ekle`}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(viewer)} onClose={() => setViewer(null)} title={viewer ? `${viewer.question.dersler?.ad || "Soru"} · ${viewer.question.konu || "Görsel"}` : "Soru görseli"} size="lg">
        <div className="question-viewer">
          {viewerImage && imageUrls[viewerImage.storage_path] && <Image src={imageUrls[viewerImage.storage_path]} alt={`Soru görseli ${(viewer?.index || 0) + 1}`} width={1400} height={1000} unoptimized />}
          {viewerImages.length > 1 && <>
            <button className="viewer-nav is-prev" onClick={() => moveViewer(-1)} aria-label="Önceki görsel"><ChevronLeft size={22} /></button>
            <button className="viewer-nav is-next" onClick={() => moveViewer(1)} aria-label="Sonraki görsel"><ChevronRight size={22} /></button>
            <span className="viewer-count">{(viewer?.index || 0) + 1} / {viewerImages.length}</span>
          </>}
        </div>
      </Modal>

      <style jsx>{`
        .wrong-head-actions { display: flex; gap: 8px; }
        .question-thumb-button { position: relative; width: 58px; height: 46px; padding: 0; overflow: visible; border: 0; border-radius: 8px; background: transparent; cursor: zoom-in; }
        .question-thumb-button :global(img) { width: 58px; height: 46px; border-radius: 8px; object-fit: cover; }
        .question-thumb-button span { position: absolute; right: -7px; bottom: -7px; min-width: 25px; height: 20px; padding: 0 5px; border: 2px solid #fff; border-radius: 999px; background: var(--study-green); color: #fff; display: inline-flex; align-items: center; justify-content: center; gap: 2px; font-size: .58rem; font-weight: 800; }
        .existing-question-images { display: flex; flex-wrap: wrap; gap: 8px; }
        .existing-question-images > div { position: relative; }
        .existing-question-images :global(img) { width: 92px; height: 72px; border: 1px solid var(--study-border); border-radius: 9px; object-fit: cover; }
        .existing-question-images button { position: absolute; top: -6px; right: -6px; width: 24px; height: 24px; border: 2px solid #fff; border-radius: 50%; background: #d64c3f; color: #fff; display: grid; place-items: center; cursor: pointer; }
        .selected-file-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .selected-file-list span { max-width: 220px; padding: 6px 8px; border-radius: 7px; background: #f1f7f4; color: var(--study-green-dark); display: inline-flex; align-items: center; gap: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .65rem; }
        .bulk-question-help { margin: -4px 0 0; color: var(--study-muted); font-size: .68rem; line-height: 1.5; }
        .bulk-image-grid { max-height: 360px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
        .bulk-image-preview { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border: 1px solid var(--study-border); border-radius: 10px; background: #f4f7f6; }
        .bulk-image-preview :global(img) { width: 100%; height: 100%; object-fit: cover; }
        .bulk-image-preview > span { position: absolute; left: 7px; bottom: 7px; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 999px; background: rgba(9, 24, 20, .78); color: #fff; display: grid; place-items: center; font-size: .62rem; font-weight: 800; }
        .bulk-image-preview > button { position: absolute; top: 7px; right: 7px; width: 28px; height: 28px; border: 0; border-radius: 50%; background: rgba(168, 43, 35, .9); color: #fff; display: grid; place-items: center; cursor: pointer; }
        .bulk-image-empty { min-height: 130px; padding: 18px; border: 1px dashed #b9c9c3; border-radius: 11px; background: #f8fbfa; color: var(--study-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; font-size: .7rem; }
        .question-viewer { position: relative; min-height: 320px; max-height: 72vh; overflow: auto; border-radius: 12px; background: #111a18; display: grid; place-items: center; }
        .question-viewer :global(img) { width: auto; max-width: 100%; height: auto; max-height: none; object-fit: contain; }
        .viewer-nav { position: sticky; top: 50%; width: 42px; height: 42px; border: 1px solid rgba(255,255,255,.25); border-radius: 50%; background: rgba(9,18,16,.76); color: #fff; display: grid; place-items: center; cursor: pointer; }
        .viewer-nav.is-prev { justify-self: start; margin: 0 0 0 12px; } .viewer-nav.is-next { justify-self: end; margin: -42px 12px 0 0; }
        .viewer-count { position: sticky; bottom: 12px; justify-self: center; padding: 5px 9px; border-radius: 999px; background: rgba(9,18,16,.78); color: #fff; font-size: .66rem; font-weight: 750; }
        @media (max-width: 620px) { .wrong-head-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; } .question-viewer { min-height: 240px; } }
      `}</style>
    </div>
  );
}
