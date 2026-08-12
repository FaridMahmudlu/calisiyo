'use client';

import { useState } from 'react';
import { Check, Compass, Save, Sparkles } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ClassroomAvatar, { AVATAR_MODELS } from './ClassroomAvatar';

const DIRECTIONS = ['south', 'south_west', 'west', 'north_west', 'north', 'north_east', 'east', 'south_east'];

export default function AvatarStudio({ open, onClose, initialAvatar, name, onSave, busy }) {
  const [model, setModel] = useState(initialAvatar?.model || 'navy');
  const [previewDirection, setPreviewDirection] = useState('south_east');

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Sınıf karakterini seç" description="Her görünüm sekiz yönden çizildi; sınıfta yürürken yönün otomatik değişir.">
      <div className="sprite-studio">
        <aside className="sprite-studio-preview">
          <span><Sparkles size={15} /> Canlı önizleme</span>
          <div className="sprite-preview-stage">
            <ClassroomAvatar avatar={{ model }} name={name} size={190} facing={previewDirection} moving />
          </div>
          <strong>{name}</strong>
          <small>{AVATAR_MODELS[model].description}</small>
          <div className="direction-preview" aria-label="Karakter yönü">
            {DIRECTIONS.map((direction) => <button key={direction} type="button" className={previewDirection === direction ? 'is-selected' : ''} onClick={() => setPreviewDirection(direction)} aria-label={`${direction} yönünü göster`}><Compass size={13} /></button>)}
          </div>
        </aside>

        <section className="sprite-model-picker">
          <header><span>Görünüm koleksiyonu</span><h3>Seni en iyi yansıtan karakteri seç</h3><p>Karakterler calisiyo için özel üretilmiş, pikselsiz ve 3/4 üst görünüşlü sprite setleridir.</p></header>
          <div>
            {Object.entries(AVATAR_MODELS).map(([key, option]) => (
              <button type="button" key={key} className={model === key ? 'is-selected' : ''} onClick={() => setModel(key)}>
                <span><ClassroomAvatar avatar={{ model: key }} name={option.label} size={104} facing="south_east" /></span>
                <strong>{option.label}</strong><small>{option.description}</small>
                {model === key && <i><Check size={14} /></i>}
              </button>
            ))}
          </div>
          <footer><button type="button" className="study-button" onClick={onClose}>Vazgeç</button><button type="button" className="study-button study-button-primary" disabled={busy} onClick={() => onSave({ model })}><Save size={16} /> {busy ? 'Kaydediliyor…' : 'Karakterimi kaydet'}</button></footer>
        </section>
      </div>
    </Modal>
  );
}
