import { useState } from 'react';
import MapPicker from './MapPicker';

/**
 * Modal yang membungkus MapPicker untuk drop pin lokasi.
 * Props:
 *   onSelect({ address, lat, lng }) — dipanggil saat user klik "Pilih Lokasi"
 *   onClose() — tutup modal tanpa pilih
 */
export default function LocationMapModal({ title = 'Pilih Lokasi di Peta', onSelect, onClose }) {
  const [picked, setPicked] = useState(null);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}
      onClick={onClose}
    >
      <div style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640,
        maxHeight: '92vh', overflow: 'auto', padding: '1.25rem',
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
          <button onClick={onClose} aria-label="Tutup"
            style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        <MapPicker
          onLocationSelect={(loc) => setPicked({
            address: loc.address,
            lat: loc.lat,
            lng: loc.lng,
          })}
        />

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Batal</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!picked}
            onClick={() => { onSelect(picked); onClose(); }}
          >
            ✓ Pakai Lokasi Ini
          </button>
        </div>
      </div>
    </div>
  );
}
