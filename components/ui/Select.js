'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export default function Select({
  ariaLabel,
  className = '',
  disabled = false,
  onChange,
  options = [],
  placeholder = 'Seçim yap',
  searchable,
  value = '',
}) {
  const id = useId();
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedValue = String(value ?? '');
  const shouldSearch = searchable ?? options.length > 8;
  const selected = options.find((option) => String(option.value) === normalizedValue);
  const visibleOptions = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('tr-TR');
    if (!term) return options;
    return options.filter((option) => `${option.label} ${option.description || ''}`.toLocaleLowerCase('tr-TR').includes(term));
  }, [options, query]);

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const choose = (nextValue) => {
    onChange?.(String(nextValue));
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key) || (event.target === searchRef.current && event.key === ' ')) return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    const currentIndex = visibleOptions.findIndex((option) => String(option.value) === normalizedValue);
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    if (event.key === 'Enter' || event.key === ' ') {
      if (visibleOptions[currentIndex]) choose(visibleOptions[currentIndex].value);
      return;
    }
    const nextIndex = Math.min(visibleOptions.length - 1, Math.max(0, currentIndex + direction));
    if (visibleOptions[nextIndex]) onChange?.(String(visibleOptions[nextIndex].value));
  };

  return (
    <div className={`study-select ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`} ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="study-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={selected ? '' : 'is-placeholder'}>{selected?.label || placeholder}</span>
        <ChevronDown aria-hidden="true" size={17} />
      </button>
      {open && (
        <div className="study-select-popover">
          {shouldSearch && (
            <div className="study-select-search">
              <Search aria-hidden="true" size={15} />
              <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ara…" aria-label={`${ariaLabel || placeholder} seçeneklerinde ara`} />
            </div>
          )}
          <div className="study-select-options" id={`${id}-listbox`} role="listbox" aria-label={ariaLabel || placeholder}>
            {visibleOptions.map((option) => {
              const active = String(option.value) === normalizedValue;
              return (
                <button
                  aria-selected={active}
                  className={active ? 'is-selected' : ''}
                  key={String(option.value)}
                  onClick={() => choose(option.value)}
                  role="option"
                  type="button"
                >
                  <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
                  {active && <Check aria-hidden="true" size={16} />}
                </button>
              );
            })}
            {!visibleOptions.length && <p className="study-select-empty">Eşleşen seçenek yok.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
