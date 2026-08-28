'use client';

import { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine, RotateCcw, Save, Trash2, Type, X } from 'lucide-react';

const COLORS = {
  white: '#f7fbf8',
  mint: '#7ce0bd',
  yellow: '#ffd66b',
  coral: '#ff9a86',
};

const toPoint = (event, svg) => {
  const rect = svg.getBoundingClientRect();
  return {
    x: Math.round(Math.max(0, Math.min(1000, ((event.clientX - rect.left) / rect.width) * 1000))),
    y: Math.round(Math.max(0, Math.min(560, ((event.clientY - rect.top) / rect.height) * 560))),
  };
};

export default function ClassroomBoard({
  open,
  board,
  isOwner,
  busy,
  onClose,
  onSaveText,
  onAppendStroke,
  onUndo,
  onClear,
}) {
  const svgRef = useRef(null);
  const drawingRef = useRef(false);
  const [text, setText] = useState(board?.text || '');
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('white');
  const [width, setWidth] = useState(5);
  const [draftPoints, setDraftPoints] = useState([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setText(board?.text || ''), 0);
    return () => window.clearTimeout(timer);
  }, [board?.text, board?.version]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !drawingRef.current) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  const strokes = Array.isArray(board?.strokes) ? board.strokes : [];

  if (!open) return null;

  const startDrawing = (event) => {
    if (busy || tool !== 'pen' || !svgRef.current) return;
    event.preventDefault();
    drawingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraftPoints([toPoint(event, svgRef.current)]);
  };

  const continueDrawing = (event) => {
    if (!drawingRef.current || !svgRef.current) return;
    const point = toPoint(event, svgRef.current);
    setDraftPoints((current) => {
      const previous = current.at(-1);
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 5) return current;
      return current.length >= 180 ? current : [...current, point];
    });
  };

  const finishDrawing = async (event) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const points = draftPoints;
    setDraftPoints([]);
    if (points.length >= 2) await onAppendStroke({ color, width, points });
  };

  const renderStroke = (stroke) => (
    <polyline
      key={stroke.id}
      points={(stroke.points || []).map((point) => `${point.x},${point.y}`).join(' ')}
      fill="none"
      stroke={COLORS[stroke.color] || COLORS.white}
      strokeWidth={stroke.width || 5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

  return (
    <div className="board-overlay" role="dialog" aria-modal="true" aria-labelledby="classroom-board-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="classroom-board-modal">
        <header>
          <div><span>CANLI SINIF TAHTASI</span><h2 id="classroom-board-title">Birlikte düşün, birlikte yaz</h2><p>Yazdıkların sınıftaki herkeste anında görünür.</p></div>
          <button type="button" onClick={onClose} aria-label="Tahtayı kapat"><X size={20} /></button>
        </header>

        <div className="board-workspace">
          <div className="board-canvas-wrap">
            <div className="board-canvas-toolbar" aria-label="Tahta çizim araçları">
              <button type="button" className={tool === 'pen' ? 'is-active' : ''} onClick={() => setTool('pen')}><PenLine size={17} /> Kalem</button>
              <button type="button" className={tool === 'text' ? 'is-active' : ''} onClick={() => setTool('text')}><Type size={17} /> Metin</button>
              <span className="board-colors">{Object.entries(COLORS).map(([name, value]) => <button key={name} type="button" className={color === name ? 'is-active' : ''} style={{ '--chalk': value }} onClick={() => { setColor(name); setTool('pen'); }} aria-label={`${name} kalem`} />)}</span>
              <label><span>Kalınlık</span><input type="range" min="2" max="12" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
              <button type="button" onClick={onUndo} disabled={busy}><RotateCcw size={17} /> Geri al</button>
              {isOwner && <button type="button" className="is-danger" onClick={onClear} disabled={busy}><Trash2 size={17} /> Temizle</button>}
            </div>
            <div className="board-surface">
              {board?.text && <div className="board-shared-text">{board.text}</div>}
              <svg
                ref={svgRef}
                viewBox="0 0 1000 560"
                role="img"
                aria-label="Sınıfın ortak çizim tahtası"
                onPointerDown={startDrawing}
                onPointerMove={continueDrawing}
                onPointerUp={finishDrawing}
                onPointerCancel={finishDrawing}
              >
                {strokes.map(renderStroke)}
                {draftPoints.length > 1 && renderStroke({ id: 'draft', color, width, points: draftPoints })}
              </svg>
              {!board?.text && strokes.length === 0 && <div className="board-empty"><Eraser size={24} /><strong>Tahta hazır</strong><span>Kalemle çiz veya ortak bir not yaz.</span></div>}
            </div>
          </div>

          <aside className={`board-text-panel${tool === 'text' ? ' is-active' : ''}`}>
            <div><Type size={17} /><span><strong>Tahta notu</strong><small>Ders başlığı, soru veya kısa açıklama</small></span></div>
            <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder="Örn. Bugünün sorusu: Bu problemin kısa yolu nedir?" />
            <footer><span>{text.length}/500</span><button type="button" onClick={() => onSaveText(text)} disabled={busy || text.trim() === (board?.text || '')}><Save size={16} /> {busy ? 'Kaydediliyor…' : 'Notu kaydet'}</button></footer>
          </aside>
        </div>
      </section>
    </div>
  );
}
