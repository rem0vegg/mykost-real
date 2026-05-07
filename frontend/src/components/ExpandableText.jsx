import { useState } from 'react';

/**
 * Tampilkan text yang panjang dengan truncate + tombol "Lihat selengkapnya".
 * Default limit 80 karakter.
 */
export default function ExpandableText({ text, limit = 80, style }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const needsTruncate = text.length > limit;
  const display = expanded || !needsTruncate ? text : text.slice(0, limit) + '…';

  return (
    <span style={style}>
      <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{display}</span>
      {needsTruncate && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginLeft: '0.4rem',
            padding: 0,
            background: 'none',
            border: 'none',
            color: '#0f3460',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {expanded ? 'sembunyikan' : 'lihat selengkapnya'}
        </button>
      )}
    </span>
  );
}

/**
 * Mask nomor telepon: 081212121212 -> 0812****1212
 */
export function maskPhone(phone) {
  if (!phone) return null;
  const s = String(phone).replace(/\s/g, '');
  if (s.length < 8) return s;
  return s.slice(0, 4) + '****' + s.slice(-4);
}
