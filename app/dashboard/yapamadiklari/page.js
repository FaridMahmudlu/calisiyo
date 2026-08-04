"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Edit3, FileImage, Plus, Trash2 } from "lucide-react";
import { useUser } from "../layout";
import { createClient } from "@/lib/supabase/client";
import { getExamTabs } from "@/lib/constants/alanlar";
import { formatDate } from "@/lib/utils/date";
import { useRealtimeRefresh } from "@/lib/hooks/useRealtimeRefresh";
import { createStudyImageUrls, uploadStudyImage } from "@/lib/supabase/storage";
import PageHeader from "@/components/ui/PageHeader";
import DataState from "@/components/ui/DataState";
import Modal from "@/components/ui/Modal";

const EMPTY_FORM = {
  ders_id: "",
  konu: "",
  kaynak: "",
  sayfa: "",
  soru_no: "",
  foto_url: "",
};
const REALTIME_TABLES = ["yapamadiklari"];

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
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError("");
    const [questionResult, courseResult] = await Promise.all([
      supabase
        .from("yapamadiklari")
        .select("*, dersler(ad, renk, ikon)")
        .eq("user_id", profile.id)
        .eq("sinav_turu", activeExam)
        .order("created_at", { ascending: false }),
      supabase
        .from("dersler")
        .select("*")
        .eq("sinav_turu", activeExam)
        .contains("alan", [profile.alan_secimi])
        .order("sira"),
    ]);
    const loadError = questionResult.error || courseResult.error;
    if (loadError) setError(loadError.message);
    const rows = questionResult.data || [];
    setQuestions(rows);
    setCourses(courseResult.data || []);
    setImageUrls(
      await createStudyImageUrls(
        supabase,
        rows.map((row) => row.foto_url),
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
    setFile(null);
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
    setFile(null);
    setModalOpen(true);
  };

  const saveQuestion = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const photoPath = file
        ? await uploadStudyImage(supabase, profile.id, file, "wrong-questions")
        : form.foto_url || null;
      const payload = {
        user_id: profile.id,
        ders_id: form.ders_id || null,
        sinav_turu: activeExam,
        konu: form.konu.trim() || null,
        kaynak: form.kaynak.trim() || null,
        sayfa: form.sayfa ? Number(form.sayfa) : null,
        soru_no: form.soru_no.trim() || null,
        foto_url: photoPath,
      };
      const { error: saveError } = editing
        ? await supabase
            .from("yapamadiklari")
            .update(payload)
            .eq("id", editing.id)
            .eq("user_id", profile.id)
        : await supabase.from("yapamadiklari").insert(payload);
      if (saveError) throw saveError;
      setModalOpen(false);
      await loadData();
    } catch (saveError) {
      setGlobalError(`Soru kaydedilemedi: ${saveError.message}`);
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
      setGlobalError(`Soru güncellenemedi: ${updateError.message}`);
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
      return setGlobalError(`Soru silinemedi: ${deleteError.message}`);
    if (question.foto_url)
      await supabase.storage.from("study-assets").remove([question.foto_url]);
    setQuestions((current) =>
      current.filter((item) => item.id !== question.id),
    );
  };

  return (
    <div className="page wrong-page">
      <PageHeader
        title="Yapamadığım Sorular"
        description="Zorlandığın soruları görseli ve kaynak bilgisiyle kaydet; çözdükçe işaretle."
        actions={
          <button
            className="study-button study-button-primary"
            onClick={openCreate}
          >
            <Plus size={16} /> Soru ekle
          </button>
        }
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
                    {imageUrls[question.foto_url] ? (
                      <Image
                        className="question-thumb"
                        src={imageUrls[question.foto_url]}
                        alt="Soru görseli"
                        width={52}
                        height={42}
                        unoptimized
                      />
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
            <select
              value={form.ders_id}
              onChange={(event) =>
                setForm({ ...form, ders_id: event.target.value })
              }
              required
            >
              <option value="">Ders seç</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.ad}
                </option>
              ))}
            </select>
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
          <label>
            Soru görseli
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
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
    </div>
  );
}
