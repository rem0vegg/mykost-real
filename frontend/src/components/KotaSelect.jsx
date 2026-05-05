import { useState, useEffect, useRef } from 'react';
import { KOTA_LIST } from '../data/kotaList';

const MAX_RESULTS = 60;

/**
 * Searchable dropdown for Indonesian kota/kabupaten.
 * Props:
 *   value      — current selected string
 *   onChange   — called with new string on selection
 *   placeholder
 *   required   — boolean (used for visual indicator only; validate in parent)
 */
export default function KotaSelect({ value, onChange, placeholder = 'Ketik nama kota...', required }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const wrapRef = useRef(null);

  // Sync query when value changes externally (e.g. auto-filled from map)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filter = (q) => {
    if (!q) return KOTA_LIST.slice(0, MAX_RESULTS);
    const lower = q.toLowerCase();
    return KOTA_LIST.filter((k) => k.toLowerCase().includes(lower)).slice(0, MAX_RESULTS);
  };

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    setResults(filter(q));
    setOpen(true);
    // If the user clears the field, clear the selection
    if (!q) onChange('');
  };

  const handleFocus = () => {
    setResults(filter(query));
    setOpen(true);
  };

  const select = (kota) => {
    onChange(kota);
    setQuery(kota);
    setOpen(false);
  };

  const isValid = KOTA_LIST.includes(value);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="form-control"
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoComplete="off"
          style={{ paddingRight: '2.2rem' }}
        />
        {/* Indicator: ✓ green when valid selection, ▾ otherwise */}
        <span style={{
          position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.85rem', color: isValid ? '#10b981' : '#9ca3af', pointerEvents: 'none',
        }}>
          {isValid ? '✓' : '▾'}
        </span>
      </div>

      {required && !isValid && query.length > 0 && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
          Pilih dari daftar kota yang tersedia
        </span>
      )}

      {open && (
        <div className="kota-dropdown">
          {results.length === 0 ? (
            <div style={{ padding: '0.75rem', color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center' }}>
              Tidak ada hasil untuk "{query}"
            </div>
          ) : (
            results.map((kota) => (
              <div
                key={kota}
                className={`kota-dropdown-item${kota === value ? ' selected' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); select(kota); }}
              >
                {kota}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
