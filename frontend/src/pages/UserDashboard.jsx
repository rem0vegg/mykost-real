import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import MapPicker from '../components/MapPicker';
import KotaSelect from '../components/KotaSelect';
import LocationSearchInput from '../components/LocationSearchInput';
import { matchKotaFromNominatim } from '../data/kotaList';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ATTACHMENTS = 5;
const CHAR_LIMIT = 500;

const PRICE = 75000;

export default function UserDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [movingOrders, setMovingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('survey');
  const [showForm, setShowForm] = useState(false);
  const [location, setLocation] = useState(null);
  const [form, setForm] = useState({ kost_name: '', address: '', kecamatan: '', kota: '', notes: '' });
  const [attachments, setAttachments] = useState([]);
  const [attachErr, setAttachErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');

  // Moving order form
  const [showMovingForm, setShowMovingForm] = useState(false);
  const MOVING_FORM_DEFAULT = {
    pickup_location: '', dropoff_location: '', distance_km: '',
    move_type: 'RINGAN', vehicle_type: 'MOTORCYCLE',
    pickup_floor: 1, dropoff_floor: 1, has_lift: false,
    has_large_items: false, is_round_trip: false, is_door_to_door: false,
    hire_helper: false, notes: '', scheduled_date: '',
  };
  const [movingForm, setMovingForm] = useState(MOVING_FORM_DEFAULT);
  const [pickupCoords, setPickupCoords]   = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [movingEstimate, setMovingEstimate] = useState(null);
  const [movingWarning, setMovingWarning] = useState(null);
  const [movingEstimating, setMovingEstimating] = useState(false);
  const [movingSubmitting, setMovingSubmitting] = useState(false);
  const [movingErr, setMovingErr] = useState('');

  const VEHICLES = [
    { value: 'MOTORCYCLE', label: '🏍️ Motor', desc: 'Maks 50 kg — koper, tas, kardus kecil', rate: 2700 },
    { value: 'VAN',        label: '🚐 Van',   desc: 'Maks 500 kg — kasur lipat, kardus banyak', rate: 13000 },
    { value: 'PICKUP_BOX', label: '🚛 Pickup Box', desc: 'Maks 1500 kg — lemari, kasur spring', rate: 20000 },
  ];

  const fetchEstimate = async (form) => {
    if (!form.distance_km || !form.vehicle_type) return;
    setMovingEstimating(true);
    try {
      const { data } = await api.post('/api/moving-orders/estimate', {
        distance_km:     parseFloat(form.distance_km),
        vehicle_type:    form.vehicle_type,
        pickup_floor:    parseInt(form.pickup_floor),
        dropoff_floor:   parseInt(form.dropoff_floor),
        has_lift:        form.has_lift,
        has_large_items: form.has_large_items,
        is_round_trip:   form.is_round_trip,
        is_door_to_door: form.is_door_to_door,
        hire_helper:     form.hire_helper,
      });
      setMovingEstimate(data);
      setMovingWarning(data.vehicle_warning);
    } catch { setMovingEstimate(null); }
    setMovingEstimating(false);
  };

  const handleMovingChange = (updates) => {
    let next = { ...movingForm, ...updates };
    // Jika kendaraan diganti ke motor, matikan hire_helper
    if (updates.vehicle_type === 'MOTORCYCLE') next.hire_helper = false;
    setMovingForm(next);
    fetchEstimate(next);
  };

  const fetchDistanceAndEstimate = async (pickup, dropoff, currentForm) => {
    setDistanceLoading(true);
    try {
      const resp = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=false`
      );
      const data = await resp.json();
      if (data.routes?.[0]?.distance) {
        const km = (data.routes[0].distance / 1000).toFixed(1);
        const next = { ...currentForm, distance_km: km };
        setMovingForm(next);
        fetchEstimate(next);
      }
    } catch {}
    setDistanceLoading(false);
  };

  const fetchData = async () => {
    try {
      const [s, m] = await Promise.all([
        api.get('/api/survey-orders'),
        api.get('/api/moving-orders'),
      ]);
      setOrders(s.data.orders);
      setMovingOrders(m.data.orders);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const onLocationSelect = (loc) => {
    setLocation(loc);
    const matchedKota = matchKotaFromNominatim(loc.kota);
    setForm((f) => ({
      ...f,
      address: loc.address,
      kota: matchedKota, 
    }));
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) { setAttachments([]); setAttachErr(''); return; }
    if (files.length > MAX_ATTACHMENTS) {
      setAttachErr(`Maksimal ${MAX_ATTACHMENTS} foto yang bisa diupload`);
      e.target.value = '';
      setAttachments([]);
      return;
    }
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setAttachErr('Hanya file gambar (JPG, PNG, WebP) yang diizinkan');
        e.target.value = '';
        setAttachments([]);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setAttachErr('Ukuran per file maksimal 5 MB');
        e.target.value = '';
        setAttachments([]);
        return;
      }
    }
    setAttachErr('');
    setAttachments(files);
  };

  const createSurveyOrder = async (e) => {
    e.preventDefault();
    if (!location) return setFormErr('Pilih lokasi kost di peta terlebih dahulu');
    if (!form.kost_name.trim()) return setFormErr('Nama kost wajib diisi');
    if (!form.kota) return setFormErr('Pilih kota dari dropdown');
    if (attachErr) return setFormErr(attachErr);
    setSubmitting(true); setFormErr('');
    try {
      const fd = new FormData();
      fd.append('kost_name', form.kost_name.trim());
      fd.append('address', form.address);
      fd.append('latitude', location.lat);
      fd.append('longitude', location.lng);
      fd.append('kecamatan', form.kecamatan || '');
      fd.append('kota', form.kota || '');
      if (form.notes.trim()) fd.append('notes', form.notes.trim());
      attachments.forEach((f) => fd.append('attachment', f));

      const { data } = await api.post('/api/survey-orders', fd);
      navigate(`/survey-orders/${data.order.id}`);
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Gagal membuat order');
    } finally {
      setSubmitting(false);
    }
  };

  const createMovingOrder = async (e) => {
    e.preventDefault();
    if (!movingForm.pickup_location) return setMovingErr('Lokasi jemput wajib diisi');
    if (!movingForm.dropoff_location) return setMovingErr('Lokasi tujuan wajib diisi');
    if (!movingForm.distance_km) return setMovingErr('Jarak belum terhitung — pastikan kedua lokasi sudah dipilih dari dropdown');
    setMovingSubmitting(true); setMovingErr('');
    try {
      await api.post('/api/moving-orders', {
        ...movingForm,
        move_type:          'RINGAN',
        distance_km:        parseFloat(movingForm.distance_km),
        pickup_floor:       parseInt(movingForm.pickup_floor),
        dropoff_floor:      parseInt(movingForm.dropoff_floor),
        pickup_latitude:    pickupCoords?.lat  || null,
        pickup_longitude:   pickupCoords?.lng  || null,
        dropoff_latitude:   dropoffCoords?.lat || null,
        dropoff_longitude:  dropoffCoords?.lng || null,
        scheduled_date:     movingForm.scheduled_date || null,
      });
      setMovingForm(MOVING_FORM_DEFAULT);
      setMovingEstimate(null);
      setMovingWarning(null);
      setPickupCoords(null);
      setDropoffCoords(null);
      setShowMovingForm(false);
      await fetchData();
    } catch (err) {
      setMovingErr(err.response?.data?.error || 'Gagal membuat order');
    } finally {
      setMovingSubmitting(false);
    }
  };

  const cancelNewSurvey = () => {
    setShowForm(false);
    setLocation(null);
    setForm({ kost_name: '', address: '', kota: '', notes: '' });
    setAttachments([]);
    setAttachErr('');
    setFormErr('');
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const stats = {
    pending: orders.filter((o) => ['pending_payment', 'finding_agent'].includes(o.status)).length,
    active: orders.filter((o) => o.status === 'assigned').length,
    done: orders.filter((o) => o.status === 'completed').length,
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="page">
      <div className="page-title">Dashboard Saya</div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card"><div className="stat-number">{stats.pending}</div><div className="stat-label">Menunggu</div></div>
        <div className="stat-card"><div className="stat-number">{stats.active}</div><div className="stat-label">Sedang Disurvei</div></div>
        <div className="stat-card"><div className="stat-number">{stats.done}</div><div className="stat-label">Selesai</div></div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'survey' ? 'active' : ''}`} onClick={() => setTab('survey')}>
          Survey Kost ({orders.length})
        </button>
        <button className={`tab-btn ${tab === 'moving' ? 'active' : ''}`} onClick={() => setTab('moving')}>
          Pindahan ({movingOrders.length})
        </button>
      </div>

      {/* ── SURVEY TAB ── */}
      {tab === 'survey' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`}
              onClick={() => showForm ? cancelNewSurvey() : setShowForm(true)}
            >
              {showForm ? 'Batal' : '+ Pesan Survey Kost'}
            </button>
          </div>

          {showForm && (
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #e94560' }}>
              <div className="card-title" style={{ marginBottom: '0.25rem' }}>Buat Order Survey Kost</div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                Biaya survey: <strong style={{ color: '#e94560' }}>Rp 75.000</strong> (dibayar setelah mengisi form)
              </p>

              {formErr && <div className="alert alert-error">{formErr}</div>}

              {/* Map */}
              <div className="form-group">
                <label className="form-label">Lokasi Kost *</label>
                <MapPicker onLocationSelect={onLocationSelect} />
              </div>

              {/* Kost details — shown after location is picked */}
              {location && (
                <>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Nama Kost *</label>
                      <input
                        className="form-control"
                        placeholder="Contoh: Kost Bu Sari"
                        value={form.kost_name}
                        onChange={(e) => setForm({ ...form, kost_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kota / Kabupaten *</label>
                      <KotaSelect
                        value={form.kota}
                        onChange={(kota) => setForm({ ...form, kota })}
                        placeholder="Pilih kota..."
                        required
                      />
                      <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                        Agent di kota ini yang akan menerima order Anda
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Alamat Lengkap</label>
                    <input
                      className="form-control"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Catatan (opsional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Contoh: Lantai 2, dekat warung hijau, minta foto kamar dan kamar mandi"
                      value={form.notes}
                      maxLength={CHAR_LIMIT}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                    {form.notes.length >= CHAR_LIMIT && (
                      <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>⚠️ Maksimal {CHAR_LIMIT} karakter</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Foto Lampiran (opsional, maks. {MAX_ATTACHMENTS} foto)</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      onChange={handleAttachmentChange}
                    />
                    {attachErr
                      ? <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>⚠️ {attachErr}</span>
                      : attachments.length > 0
                        ? <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>✓ {attachments.length} foto dipilih</span>
                        : <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Format: JPG, PNG, WebP · Maks. {MAX_ATTACHMENTS} foto · Maks. 5 MB/foto</span>
                    }
                  </div>

                  <div className="payment-info-box">
                    <span>💳 Total yang harus dibayar:</span>
                    <strong>Rp {PRICE.toLocaleString('id-ID')}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button className="btn btn-primary" type="button" onClick={createSurveyOrder} disabled={submitting}>
                      {submitting ? 'Membuat order...' : 'Buat Order & Bayar →'}
                    </button>
                    <button className="btn btn-outline" type="button" onClick={cancelNewSurvey}>Batal</button>
                  </div>
                </>
              )}
            </div>
          )}

          {orders.length === 0 && !showForm ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏠</div>
              <p>Belum ada order survey kost. Buat order pertamamu!</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <div className="order-card-title">{order.kost_name}</div>
                    <div className="order-meta">{order.address?.slice(0, 70)}{order.address?.length > 70 ? '...' : ''}</div>
                    <div className="order-meta">
                      {order.kecamatan && `${order.kecamatan}, `}{order.kota}
                    </div>
                    {order.agent_name && <div className="order-meta">Agent: {order.agent_name}</div>}
                    {order.status === 'pending_payment' && (
                      <div className="order-meta" style={{ color: '#e94560', fontWeight: 600 }}>
                        ⏳ Belum dibayar – Rp {(order.price || 75000).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="order-actions">
                  {order.status !== 'pending_payment' && order.status !== 'finding_agent' && (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/survey-orders/${order.id}`)}>💬 Chat Agent</button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/survey-orders/${order.id}`)}>
                    {order.status === 'pending_payment' ? '💳 Bayar Sekarang' : 'Lihat Detail'}
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ── MOVING TAB ── */}
      {tab === 'moving' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className={`btn ${showMovingForm ? 'btn-outline' : 'btn-primary'}`} onClick={() => {
              if (showMovingForm) {
                setMovingForm(MOVING_FORM_DEFAULT);
                setMovingEstimate(null); setMovingWarning(null);
                setPickupCoords(null); setDropoffCoords(null);
              }
              setShowMovingForm(!showMovingForm);
            }}>
              {showMovingForm ? 'Batal' : '+ Order Pindahan'}
            </button>
          </div>
          {showMovingForm && (
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #0f3460' }}>
              <div className="card-title">Buat Order Pindahan</div>
              {movingErr && <div className="alert alert-error">{movingErr}</div>}

              {/* Step 1 – Lokasi & Jarak */}
              <p className="form-label" style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Lokasi & Jarak</p>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Lokasi Jemput *</label>
                  <LocationSearchInput
                    value={movingForm.pickup_location}
                    onTextChange={(text) => setMovingForm((f) => ({ ...f, pickup_location: text }))}
                    onSelect={({ address, lat, lng }) => {
                      const coords = { lat, lng };
                      const updated = { ...movingForm, pickup_location: address };
                      setPickupCoords(coords);
                      setMovingForm(updated);
                      if (dropoffCoords) fetchDistanceAndEstimate(coords, dropoffCoords, updated);
                    }}
                    placeholder="Cari alamat jemput..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lokasi Tujuan *</label>
                  <LocationSearchInput
                    value={movingForm.dropoff_location}
                    onTextChange={(text) => setMovingForm((f) => ({ ...f, dropoff_location: text }))}
                    onSelect={({ address, lat, lng }) => {
                      const coords = { lat, lng };
                      const updated = { ...movingForm, dropoff_location: address };
                      setDropoffCoords(coords);
                      setMovingForm(updated);
                      if (pickupCoords) fetchDistanceAndEstimate(pickupCoords, coords, updated);
                    }}
                    placeholder="Cari alamat tujuan..."
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Estimasi Jarak (km) *</label>
                <input className="form-control" type="number" min="0.1" step="0.1"
                  value={movingForm.distance_km} placeholder="Otomatis dihitung setelah pilih lokasi"
                  onChange={(e) => handleMovingChange({ distance_km: e.target.value })} />
                {distanceLoading
                  ? <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Menghitung jarak via OpenStreetMap...</span>
                  : pickupCoords && dropoffCoords && movingForm.distance_km
                    ? <span style={{ fontSize: '0.78rem', color: '#10b981' }}>✓ Jarak dihitung otomatis ({movingForm.distance_km} km) — bisa diubah manual</span>
                    : <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Pilih kedua lokasi dari dropdown untuk hitung jarak otomatis</span>
                }
              </div>

              {/* Step 2 – Kendaraan */}
              <p className="form-label" style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Pilih Kendaraan</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {VEHICLES.map((v) => (
                  <div key={v.value}
                    onClick={() => handleMovingChange({ vehicle_type: v.value })}
                    style={{
                      border: `2px solid ${movingForm.vehicle_type === v.value ? '#0f3460' : '#e5e7eb'}`,
                      borderRadius: 8, padding: '0.6rem 1rem', cursor: 'pointer',
                      background: movingForm.vehicle_type === v.value ? '#f0f4ff' : '#fff',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{v.label}</span>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: '0.5rem' }}>{v.desc}</span>
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#0f3460', fontWeight: 600 }}>
                      Rp {v.rate.toLocaleString('id-ID')}/km
                    </span>
                  </div>
                ))}
              </div>
              {movingWarning && movingWarning.map((w, i) => (
                <div key={i} className="alert" style={{ background: '#fffbeb', borderLeft: '3px solid #f59e0b', color: '#92400e', marginBottom: '0.5rem', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}>
                  ⚠️ {w}
                </div>
              ))}

              {/* Step 3 – Info Tambahan */}
              <p className="form-label" style={{ fontWeight: 700, marginBottom: '0.5rem', marginTop: '0.75rem' }}>Info Tambahan</p>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Lantai Jemput</label>
                  <input className="form-control" type="number" min="1" max="50"
                    value={movingForm.pickup_floor}
                    onChange={(e) => handleMovingChange({ pickup_floor: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lantai Tujuan</label>
                  <input className="form-control" type="number" min="1" max="50"
                    value={movingForm.dropoff_floor}
                    onChange={(e) => handleMovingChange({ dropoff_floor: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'has_lift',       label: 'Ada Lift' },
                  { key: 'has_large_items',label: 'Ada Barang Besar (lemari, kasur spring)' },
                  { key: 'is_round_trip',  label: 'Pulang Pergi (+50% dari total)' },
                  { key: 'is_door_to_door',label: 'Door-to-Door (+Rp 20.000)' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={movingForm[key]}
                      onChange={(e) => handleMovingChange({ [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
                {movingForm.vehicle_type !== 'MOTORCYCLE' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={movingForm.hire_helper}
                      onChange={(e) => handleMovingChange({ hire_helper: e.target.checked })} />
                    Hire Helper (+Rp 75.000)
                  </label>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Catatan (opsional)</label>
                <textarea className="form-control" rows={2}
                  value={movingForm.notes} maxLength={CHAR_LIMIT}
                  onChange={(e) => setMovingForm({ ...movingForm, notes: e.target.value })}
                  placeholder="Contoh: barang mudah pecah, parkir sempit, dll." />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Pindah</label>
                <input className="form-control" type="date"
                  value={movingForm.scheduled_date}
                  onChange={(e) => setMovingForm({ ...movingForm, scheduled_date: e.target.value })} />
              </div>

              {/* Estimasi Harga */}
              {movingEstimating && <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Menghitung harga...</div>}
              {movingEstimate && (
                <div style={{ background: '#f0f4ff', border: '1.5px solid #0f3460', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#0f3460' }}>Estimasi Harga</div>
                  <div style={{ fontSize: '0.85rem', color: '#374151', display: 'grid', gap: '0.2rem' }}>
                    <div>Tarif dasar: <strong>Rp {movingEstimate.base_price?.toLocaleString('id-ID')}</strong></div>
                    {movingEstimate.surcharge > 0 && <div>Surcharge: <strong>Rp {movingEstimate.surcharge?.toLocaleString('id-ID')}</strong></div>}
                    {movingEstimate.addon_price > 0 && <div>Add-on: <strong>Rp {movingEstimate.addon_price?.toLocaleString('id-ID')}</strong></div>}
                    {movingEstimate.round_trip_addon > 0 && <div>Pulang pergi (+50%): <strong>Rp {movingEstimate.round_trip_addon?.toLocaleString('id-ID')}</strong></div>}
                  </div>
                  {movingEstimate.requires_review ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ color: '#92400e', fontWeight: 700 }}>
                        Perkiraan: Rp {movingEstimate.price_min?.toLocaleString('id-ID')} – Rp {movingEstimate.price_max?.toLocaleString('id-ID')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#b45309' }}>⚠️ Order ini perlu review admin sebelum dikonfirmasi</div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f3460' }}>
                      Total: Rp {movingEstimate.estimated_price?.toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-primary" type="button" onClick={createMovingOrder} disabled={movingSubmitting}>
                {movingSubmitting ? 'Membuat...' : 'Buat Order Pindahan →'}
              </button>
            </div>
          )}
          {movingOrders.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🚚</div><p>Belum ada order pindahan.</p></div>
          ) : (
            movingOrders.map((o) => (
              <div key={o.id} className="order-card" style={{ borderLeftColor: o.status === 'INVALID' ? '#ef4444' : '#0f3460' }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-card-title">{o.pickup_location} → {o.dropoff_location}</div>
                    <div className="order-meta">
                      {o.move_type} · {o.vehicle_type} · {o.distance_km} km · Tanggal: {fmt(o.scheduled_date)}
                    </div>
                    <div className="order-meta" style={{ fontWeight: 600, color: '#0f3460' }}>
                      {o.requires_review && o.price_min
                        ? `Rp ${Number(o.price_min).toLocaleString('id-ID')} – Rp ${Number(o.price_max).toLocaleString('id-ID')}`
                        : `Rp ${Number(o.estimated_price).toLocaleString('id-ID')}`}
                    </div>
                    {o.mover_name && <div className="order-meta">Mover: {o.mover_name}</div>}
                    {o.status === 'INVALID' && o.invalid_reason && (
                      <div className="order-meta" style={{ color: '#ef4444', fontWeight: 600 }}>
                        ❌ Mismatch: {o.invalid_reason}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="order-actions">
                  {!['DRAFT','INSTANT_CONFIRMED','REVIEW_REQUIRED','INVALID','CANCELLED'].includes(o.status) && (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/moving-orders/${o.id}`)}>💬 Chat Mover</button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/moving-orders/${o.id}`)}>Lihat Detail</button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
