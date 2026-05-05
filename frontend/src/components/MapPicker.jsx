import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Vite/bundler marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const NOMINATIM = 'https://nominatim.openstreetmap.org';

function extractLocation(data) {
  const addr = data.address || {};
  const kecamatan = addr.suburb || addr.village || addr.quarter || addr.neighbourhood || addr.municipality || '';
  const kota = addr.city || addr.town || addr.county || addr.regency || addr.city_district || addr.state_district || '';
  return {
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon || data.lng),
    address: data.display_name || '',
    kecamatan,
    kota,
  };
}

// Moves map when flyTo prop changes (must be inside MapContainer)
function FlyToMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 17, { duration: 1 });
  }, [position, map]);
  return null;
}

// Handles map click events (must be inside MapContainer)
function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

// Props:
//   onLocationSelect({ lat, lng, address, kecamatan, kota }) — called whenever pin is placed
export default function MapPicker({ onLocationSelect }) {
  const [markerPos, setMarkerPos] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reversing, setReversing] = useState(false);
  const searchTimer = useRef(null);
  const suggestRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const close = (e) => { if (!suggestRef.current?.contains(e.target)) setSuggestions([]); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const placePin = async (latlng, displayName) => {
    setMarkerPos([latlng.lat, latlng.lng]);
    setFlyTo([latlng.lat, latlng.lng]);
    setReversing(true);
    try {
      const res = await fetch(
        `${NOMINATIM}/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data = await res.json();
      const loc = extractLocation(data);
      if (displayName) loc.address = displayName;
      onLocationSelect(loc);
    } catch {
      onLocationSelect({ lat: latlng.lat, lng: latlng.lng, address: displayName || '', kecamatan: '', kota: '' });
    } finally {
      setReversing(false);
    }
  };

  const handleSearchInput = (value) => {
    setQuery(value);
    clearTimeout(searchTimer.current);
    if (value.length < 3) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${NOMINATIM}/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&countrycodes=id&limit=6`,
          { headers: { 'Accept-Language': 'id' } }
        );
        const data = await res.json();
        setSuggestions(data);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const selectSuggestion = (item) => {
    const loc = extractLocation(item);
    setQuery(item.display_name);
    setSuggestions([]);
    placePin({ lat: loc.lat, lng: loc.lng }, item.display_name);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Search bar */}
      <div ref={suggestRef} style={{ position: 'relative', marginBottom: '0.5rem' }}>
        <input
          className="form-control"
          placeholder="Cari alamat atau nama kost..."
          value={query}
          onChange={(e) => handleSearchInput(e.target.value)}
          autoComplete="off"
        />
        {searching && (
          <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#9ca3af' }}>
            Mencari...
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="map-suggestions">
            {suggestions.map((s) => (
              <div key={s.place_id} className="map-suggestion-item" onClick={() => selectSuggestion(s)}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name || s.display_name.split(',')[0]}</span>
                <span style={{ fontSize: '0.78rem', color: '#6b7280', display: 'block' }}>
                  {s.display_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={[-6.3728, 106.8272]}
        zoom={12}
        style={{ height: '320px', borderRadius: '8px', border: '1.5px solid #d1d5db' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler onMapClick={(latlng) => placePin(latlng)} />
        {flyTo && <FlyToMarker position={flyTo} />}
        {markerPos && <Marker position={markerPos} />}
      </MapContainer>

      <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.4rem' }}>
        {reversing ? '📍 Memuat alamat...' : markerPos ? '✅ Lokasi dipilih. Periksa dan lengkapi form di bawah.' : '📍 Klik pada peta atau gunakan pencarian untuk menandai lokasi kost.'}
      </p>
    </div>
  );
}
