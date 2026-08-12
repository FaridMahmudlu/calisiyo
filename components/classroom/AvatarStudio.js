'use client';

import { useMemo, useState } from 'react';
import { Check, Dices, Glasses, Palette, RefreshCcw, Save, Scissors } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ClassroomAvatar, { AVATAR_OPTIONS, DEFAULT_AVATAR } from './ClassroomAvatar';

const HAIR_LABELS = ['Kısa 1', 'Kısa 2', 'Kısa 3', 'Kısa 4', 'Kısa 5', 'Kısa 6', 'Kısa 7', 'Kısa 8', 'Kısa 9', 'Kısa 10', 'Uzun 1', 'Uzun 2', 'Uzun 3', 'Uzun 4', 'Uzun 5', 'Uzun 6'];
const EXPRESSION_LABELS = ['Sakin', 'Neşeli', 'Odaklı', 'Enerjik', 'Gülümseyen', 'Rahat'];

export default function AvatarStudio({ open, onClose, initialAvatar, name, onSave, busy }) {
  const [draft, setDraft] = useState({ ...DEFAULT_AVATAR, ...initialAvatar });
  const [shuffleSeed, setShuffleSeed] = useState(false);

  const preview = useMemo(
    () => ({ ...draft, seed: shuffleSeed ? `${draft.seed}-preview` : draft.seed }),
    [draft, shuffleSeed],
  );

  const choose = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Karakterini tasarla" description="Sınıfta seni temsil eden sıcak ve kişisel görünümü seç.">
      <div className="avatar-studio">
        <aside className="avatar-studio-preview">
          <span>Canlı önizleme</span>
          <div><ClassroomAvatar avatar={preview} name={name} size={150} priority /></div>
          <strong>{name}</strong>
          <small>Değişikliklerin yalnızca sınıf karakterine uygulanır.</small>
          <button type="button" onClick={() => setShuffleSeed((value) => !value)}><Dices size={16} /> Yüzü yenile</button>
        </aside>

        <div className="avatar-studio-options">
          <section>
            <header><Scissors size={16} /><strong>Saç modeli</strong></header>
            <div className="avatar-hair-grid">
              {AVATAR_OPTIONS.hair.map((hair, index) => (
                <button type="button" key={hair} className={draft.hair === hair ? 'is-selected' : ''} onClick={() => choose('hair', hair)}>
                  <ClassroomAvatar avatar={{ ...draft, hair }} name={HAIR_LABELS[index]} size={48} />
                  <span>{HAIR_LABELS[index]}</span>{draft.hair === hair && <Check size={13} />}
                </button>
              ))}
            </div>
          </section>

          <section className="avatar-color-section">
            <header><Palette size={16} /><strong>Renkler</strong></header>
            <label><span>Ten rengi</span><div>{AVATAR_OPTIONS.skin.map((color) => <button aria-label={`Ten rengi ${color}`} type="button" key={color} className={draft.skin === color ? 'is-selected' : ''} style={{ '--swatch': `#${color}` }} onClick={() => choose('skin', color)} />)}</div></label>
            <label><span>Saç rengi</span><div>{AVATAR_OPTIONS.hairColor.map((color) => <button aria-label={`Saç rengi ${color}`} type="button" key={color} className={draft.hairColor === color ? 'is-selected' : ''} style={{ '--swatch': `#${color}` }} onClick={() => choose('hairColor', color)} />)}</div></label>
            <label><span>Arka plan</span><div>{AVATAR_OPTIONS.background.map((color) => <button aria-label={`Arka plan ${color}`} type="button" key={color} className={draft.background === color ? 'is-selected' : ''} style={{ '--swatch': `#${color}` }} onClick={() => choose('background', color)} />)}</div></label>
          </section>

          <section>
            <header><Glasses size={16} /><strong>Gözlük</strong></header>
            <div className="avatar-pill-options">{AVATAR_OPTIONS.glasses.map((glasses, index) => <button type="button" key={glasses} className={draft.glasses === glasses ? 'is-selected' : ''} onClick={() => choose('glasses', glasses)}>{index === 0 ? 'Yok' : `Model ${index}`}</button>)}</div>
          </section>

          <section>
            <header><RefreshCcw size={16} /><strong>İfade</strong></header>
            <div className="avatar-pill-options">{AVATAR_OPTIONS.expression.map((expression, index) => <button type="button" key={expression} className={draft.expression === expression ? 'is-selected' : ''} onClick={() => choose('expression', expression)}>{EXPRESSION_LABELS[index]}</button>)}</div>
          </section>

          <footer>
            <small className="avatar-attribution">Karakter çizimleri: <a href="https://www.instagram.com/lischi_art/" target="_blank" rel="noreferrer">Lisa Wischofsky</a> / DiceBear · CC BY 4.0</small>
            <button type="button" className="study-button" onClick={onClose}>Vazgeç</button>
            <button type="button" className="study-button study-button-primary" disabled={busy} onClick={() => onSave(draft, shuffleSeed)}><Save size={16} /> {busy ? 'Kaydediliyor…' : 'Karakterimi kaydet'}</button>
          </footer>
        </div>
      </div>
    </Modal>
  );
}
