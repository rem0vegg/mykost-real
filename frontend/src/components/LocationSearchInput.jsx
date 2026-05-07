import { useState, useRef, useEffect } from 'react';

export default function LocationSearchInput({ value, onTextChange, onSelect, placeholder }) {
  const [query, setQuery]           = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const debounceRef                 = useRef(null);
  const containerRef                = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onTextChange(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Nominatim TOS: max ~1 req/s — kita patuhi via debounce 600ms + filter countrycodes.
        // UA tidak bisa di-set dari browser; gunakan Referer otomatis dari browser sebagai attribution.
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&countrycodes=id&limit=5&addressdetails=0`,
          { headers: { 'Accept-Language': 'id' } }
        );
        if (!res.ok) throw new Error('nominatim error');
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const handleSelect = (item) => {
    const address = item.display_name;
    setQuery(address);
    setSuggestions([]);
    setOpen(false);
    onSelect({ address, lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="form-control"
        value={query}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {loading && (
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>Mencari lokasi...</div>
      )}
      {open && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto',
          margin: 0, padding: 0, listStyle: 'none',
        }}>
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onMouseDown={() => handleSelect(item)}
              style={{
                padding: '0.55rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6', lineHeight: 1.4,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
