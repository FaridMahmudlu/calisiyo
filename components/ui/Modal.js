'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, description, onClose, children, size = 'md' }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector('button, input, select, textarea, [href]');
    focusable?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = [...dialogRef.current.querySelectorAll('button, input, select, textarea, [href]')]
        .filter((element) => !element.disabled && element.tabIndex !== -1);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section
        ref={dialogRef}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="modal-header">
          <div>
            <h2 id={titleId} className="modal-title">{title}</h2>
            {description && <p id={descriptionId} className="modal-description">{description}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Pencereyi kapat">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
