import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import MapPicker from '../components/MapPicker';
import KotaSelect from '../components/KotaSelect';
import LocationSearchInput from '../components/LocationSearchInput';
import LocationMapModal from '../components/LocationMapModal';
import Icon from '../components/Icon';
import { matchKotaFromNominatim } from '../data/kotaList';
import useAuthStore from '../store/authStore';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const CHAR_LIMIT = 500;
const PRICE = 75000;

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const STATUS_LABEL = {
  pending_payment: { cls: 'mk-pill mk-pill-warn', label: 'Menunggu pembayaran' },
  finding_agent:   { cls: 'mk-pill mk-pill-info', label: 'Mencari surveyor' },
  assigned:        { cls: 'mk-pill mk-pill-info', label: 'Sedang disurvei' },
  completed:       { cls: 'mk-pill mk-pill-ok',   label: 'Selesai' },
  cancelled:       { cls: 'mk-pill',              label: 'Dibatalkan' },
  DRAFT:             { cls: 'mk-pill',              label: 'Draft' },
  INSTANT_CONFIRMED: { cls: 'mk-pill mk-pill-info', label: 'Menunggu mover' },
  REVIEW_REQUIRED:   { cls: 'mk-pill mk-pill-warn', label: 'Perlu review' },
  ACCEPTED:          { cls: 'mk-pill mk-pill-info', label: 'Mover ditugaskan' },
  ON_GOING:          { cls: 'mk-pill mk-pill-info', label: 'Sedang pindahan' },
  COMPLETED:         { cls: 'mk-pill mk-pill-ok',   label: 'Selesai' },
  INVALID:           { cls: 'mk-pill mk-pill-err',  label: 'Dibatalkan' },
  CANCELLED:         { cls: 'mk-pill',              label: 'Dibatalkan' },
};

function StatusPill({ status }) {
  const cfg = STATUS_LABEL[status] || { cls: 'mk-pill mk-pill-info', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [movingOrders, setMovingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') === 'moving' ? 'moving' : 'survey');
  const [showForm, setShowForm] = useState(false);
  const [location, setLocation] = useState(null);
  const [form, setForm] = useState({ kost_name: '', address: '', kecamatan: '', kota: '', notes: '' });
  const [attachments, setAttachments] = useState([]);
  const [attachErr, setAttachErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');

  const [showMovingForm, setShowMovingForm] = useState(false);
  const MOVING_FORM_DEFAULT = {
    pickup_location: '', dropoff_location: '', distance_km: '',
    move_type: 'RINGAN', vehicle_type: 'MOTORCYCLE',
    pickup_floor: 1, dropoff_floor: 1, has_lift: false,
    has_large_items: false, is_round_trip: false, is_door_to_door: false,
    extra_helper: false,
    has_parking: false, narrow_alley: false, has_fragile: false,
    needs_disassembly: false, estimated_item_count: '',
    notes: '', scheduled_date: '',
  };
  const [movingForm, setMovingForm] = useState(MOVING_FORM_DEFAULT);
  const [pickupCoords, setPickupCoords]   = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [movingPhotos, setMovingPhotos] = useState([]);
  const [movingPhotoErr, setMovingPhotoErr] = useState('');
  const [showPickupMap, setShowPickupMap]   = useState(false);
  const [showDropoffMap, setShowDropoffMap] = useState(false);
  const [movingEstimate, setMovingEstimate] = useState(null);
  const [movingWarning, setMovingWarning] = useState(null);
  const [movingEstimating, setMovingEstimating] = useState(false);
  const [movingSubmitting, setMovingSubmitting] = useState(false);
  const [movingErr, setMovingErr] = useState('');

  const VEHICLES = [
    { value: 'MOTORCYCLE', label: 'Motor',      desc: 'Maks 50 kg — koper, tas, kardus kecil', rate: 2700 },
    { value: 'VAN',        label: 'Van',         desc: 'Maks 500 kg — kasur lipat, kardus banyak', rate: 13000 },
    { value: 'PICKUP_BOX', label: 'Pickup Box',  desc: 'Maks 1500 kg — lemari, kasur spring', rate: 20000 },
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
        extra_helper:    form.extra_helper,
      });
      setMovingEstimate(data);
      setMovingWarning(data.vehicle_warning);
    } catch { setMovingEstimate(null); }
    setMovingEstimating(false);
  };

  const handleMovingChange = (updates) => {
    let next = { ...movingForm, ...updates };
    if (updates.vehicle_type === 'MOTORCYCLE') next.extra_helper = false;
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

  const handleMovingPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) { setMovingPhotos([]); setMovingPhotoErr(''); return; }
    if (files.length > MAX_ATTACHMENTS) { setMovingPhotoErr(`Maksimal ${MAX_ATTACHMENTS} foto`); e.target.value = ''; setMovingPhotos([]); return; }
    for (const f of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) { setMovingPhotoErr('Hanya JPG / PNG / WebP'); e.target.value = ''; setMovingPhotos([]); return; }
      if (f.size > MAX_FILE_SIZE) { setMovingPhotoErr('Maksimal 5 MB per foto'); e.target.value = ''; setMovingPhotos([]); return; }
    }
    setMovingPhotoErr('');
    setMovingPhotos(files);
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

  useEffect(() => {
    const raw = sessionStorage.getItem('movingPrefill');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.dropoff_location) {
        setMovingForm((f) => ({ ...f, dropoff_location: data.dropoff_location }));
        if (data.dropoff_latitude && data.dropoff_longitude) {
          setDropoffCoords({ lat: data.dropoff_latitude, lng: data.dropoff_longitude });
        }
        setShowMovingForm(true);
        setTab('moving');
      }
    } catch {}
    sessionStorage.removeItem('movingPrefill');
  }, []);

  const onLocationSelect = (loc) => {
    setLocation(loc);
    const matchedKota = matchKotaFromNominatim(loc.kota);
    setForm((f) => ({ ...f, address: loc.address, kota: matchedKota }));
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) { setAttachments([]); setAttachErr(''); return; }
    if (files.length > MAX_ATTACHMENTS) { setAttachErr(`Maksimal ${MAX_ATTACHMENTS} foto`); e.target.value = ''; setAttachments([]); return; }
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setAttachErr('Hanya file gambar (JPG, PNG, WebP)'); e.target.value = ''; setAttachments([]); return; }
      if (file.size > MAX_FILE_SIZE) { setAttachErr('Maks. 5 MB per file'); e.target.value = ''; setAttachments([]); return; }
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
    if (!movingForm.distance_km) return setMovingErr('Jarak belum terhitung — pastikan kedua lokasi sudah dipilih');
    if (movingPhotos.length === 0) return setMovingErr('Upload minimal 1 foto barang');
    if (movingPhotos.length > MAX_ATTACHMENTS) return setMovingErr(`Maksimal ${MAX_ATTACHMENTS} foto`);
    if (movingPhotoErr) return setMovingErr(movingPhotoErr);
    setMovingSubmitting(true); setMovingErr('');
    try {
      const { data } = await api.post('/api/moving-orders', {
        ...movingForm,
        move_type:            'RINGAN',
        distance_km:          parseFloat(movingForm.distance_km),
        pickup_floor:         parseInt(movingForm.pickup_floor),
        dropoff_floor:        parseInt(movingForm.dropoff_floor),
        pickup_latitude:      pickupCoords?.lat  || null,
        pickup_longitude:     pickupCoords?.lng  || null,
        dropoff_latitude:     dropoffCoords?.lat || null,
        dropoff_longitude:    dropoffCoords?.lng || null,
        scheduled_date:       movingForm.scheduled_date || null,
        estimated_item_count: movingForm.estimated_item_count ? parseInt(movingForm.estimated_item_count) : null,
      });
      const orderId = data.order?.id;
      if (orderId && movingPhotos.length > 0) {
        const fd = new FormData();
        movingPhotos.forEach((f) => fd.append('photos', f));
        try { await api.post(`/api/moving-orders/${orderId}/photos`, fd); } catch {}
      }
      setMovingForm(MOVING_FORM_DEFAULT);
      setMovingEstimate(null); setMovingWarning(null);
      setPickupCoords(null);  setDropoffCoords(null);
      setMovingPhotos([]);    setMovingPhotoErr('');
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

  if (loading) return <div className="mk-loading"><div className="mk-spinner" /></div>;

  return (
    <div className="mk-page">
      {/* Header */}
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink-mute)', fontWeight: 500 }}>Selamat datang kembali</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-.02em' }}>
          Halo, {user?.name?.split(' ')[0] || 'Kamu'}
        </h1>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          onClick={() => { setTab('survey'); setShowForm(true); }}
          style={{
            padding: 18, textAlign: 'left', cursor: 'pointer', border: 'none',
            background: 'var(--brand)', color: '#fff',
            borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120,
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center' }}>
            <Icon name="clipboard" size={18} stroke={2} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Pesan Survei Kost</div>
            <div style={{ fontSize: 12, opacity: .85, lineHeight: 1.4 }}>Surveyor cek langsung, kirim foto & laporan</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: .9 }}>Mulai {rp(PRICE)}</div>
        </button>

        <button
          onClick={() => { setTab('moving'); setShowMovingForm(true); }}
          style={{
            padding: 18, textAlign: 'left', cursor: 'pointer',
            background: 'var(--surface)', color: 'var(--ink)',
            border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
            display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--brand-soft)', color: 'var(--brand-ink)', display: 'grid', placeItems: 'center' }}>
            <Icon name="truck" size={18} stroke={2} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Order Pindahan</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>Motor / van / pickup. Estimasi otomatis.</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>Hitung biaya →</div>
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="mk-stat">
          <div className="mk-stat-label">Berlangsung</div>
          <div className="mk-stat-value">{orders.filter((o) => o.status === 'assigned').length + movingOrders.filter((o) => ['ACCEPTED','ON_GOING'].includes(o.status)).length}</div>
          <div className="mk-stat-sub">survei + pindahan</div>
        </div>
        <div className="mk-stat">
          <div className="mk-stat-label">Menunggu</div>
          <div className="mk-stat-value">{orders.filter((o) => ['pending_payment','finding_agent'].includes(o.status)).length}</div>
          <div className="mk-stat-sub">perlu tindakan</div>
        </div>
        <div className="mk-stat">
          <div className="mk-stat-label">Selesai</div>
          <div className="mk-stat-value">{orders.filter((o) => o.status === 'completed').length + movingOrders.filter((o) => o.status === 'COMPLETED').length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="mk-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="mk-tabs">
            <button className={`mk-tab${tab === 'survey' ? ' active' : ''}`} onClick={() => setTab('survey')}>
              Survei Kost ({orders.length})
            </button>
            <button className={`mk-tab${tab === 'moving' ? ' active' : ''}`} onClick={() => setTab('moving')}>
              Pindahan ({movingOrders.length})
            </button>
          </div>
          {tab === 'survey' && (
            <button
              className={`mk-btn mk-btn-sm ${showForm ? 'mk-btn-ghost' : 'mk-btn-primary'}`}
              onClick={() => showForm ? cancelNewSurvey() : setShowForm(true)}
            >
              {showForm ? 'Batal' : (<><Icon name="plus" size={14} /> Pesan Survei</>)}
            </button>
          )}
          {tab === 'moving' && (
            <button
              className={`mk-btn mk-btn-sm ${showMovingForm ? 'mk-btn-ghost' : 'mk-btn-primary'}`}
              onClick={() => {
                if (showMovingForm) {
                  setMovingForm(MOVING_FORM_DEFAULT);
                  setMovingEstimate(null); setMovingWarning(null);
                  setPickupCoords(null); setDropoffCoords(null);
                  setMovingPhotos([]); setMovingPhotoErr('');
                }
                setShowMovingForm(!showMovingForm);
              }}
            >
              {showMovingForm ? 'Batal' : (<><Icon name="plus" size={14} /> Order Pindahan</>)}
            </button>
          )}
        </div>

        {/* ── SURVEY TAB ── */}
        {tab === 'survey' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {showForm && (
              <div className="mk-card" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: '0 0 4px', letterSpacing: '-.01em' }}>
                  Pesan Survei Kost
                </h3>
                <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 20 }}>
                  Biaya survei: <strong style={{ color: 'var(--brand)' }}>{rp(PRICE)}</strong> — dibayar setelah mengisi form
                </p>

                {formErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 16 }}>{formErr}</div>}

                <div style={{ marginBottom: 16 }}>
                  <label className="mk-label">Lokasi Kost *</label>
                  <MapPicker onLocationSelect={onLocationSelect} />
                </div>

                {location && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div>
                        <label className="mk-label">Nama Kost *</label>
                        <input className="mk-input" placeholder="Contoh: Kost Bu Sari"
                          value={form.kost_name}
                          onChange={(e) => setForm({ ...form, kost_name: e.target.value })} required />
                      </div>
                      <div>
                        <label className="mk-label">Kota / Kabupaten *</label>
                        <KotaSelect value={form.kota} onChange={(kota) => setForm({ ...form, kota })} placeholder="Pilih kota..." required />
                        <div className="mk-help">Surveyor dari kota ini yang akan dikirimi order Anda</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label className="mk-label">Alamat Lengkap</label>
                      <input className="mk-input" value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label className="mk-label">Catatan (opsional)</label>
                      <textarea className="mk-input" rows={3}
                        placeholder="Contoh: Lantai 2, dekat warung hijau, minta foto kamar dan kamar mandi"
                        value={form.notes} maxLength={CHAR_LIMIT}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                      {form.notes.length >= CHAR_LIMIT && (
                        <div className="mk-help" style={{ color: 'var(--err)' }}>Maksimal {CHAR_LIMIT} karakter</div>
                      )}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label className="mk-label">Foto Lampiran (opsional, maks. {MAX_ATTACHMENTS} foto)</label>
                      <input type="file" className="mk-input" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={handleAttachmentChange} />
                      {attachErr
                        ? <div className="mk-help" style={{ color: 'var(--err)' }}>{attachErr}</div>
                        : attachments.length > 0
                          ? <div className="mk-help" style={{ color: 'var(--ok)' }}>{attachments.length} foto dipilih</div>
                          : <div className="mk-help">Format: JPG, PNG, WebP · Maks. {MAX_ATTACHMENTS} foto · Maks. 5 MB/foto</div>
                      }
                    </div>
                    <div style={{ background: 'var(--ok-soft)', border: '1px solid var(--brand-soft)', borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Total yang harus dibayar:</span>
                      <strong style={{ fontSize: 15, color: 'var(--brand)', fontFamily: 'var(--font-display)' }}>{rp(PRICE)}</strong>
                    </div>
                    <div className="mk-row" style={{ gap: 10 }}>
                      <button className="mk-btn mk-btn-primary" type="button" onClick={createSurveyOrder} disabled={submitting}>
                        {submitting ? 'Membuat order...' : (<><Icon name="arrow-right" size={15} /> Buat Order & Bayar</>)}
                      </button>
                      <button className="mk-btn mk-btn-ghost" type="button" onClick={cancelNewSurvey}>Batal</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {orders.length === 0 && !showForm ? (
              <div className="mk-empty">
                <div className="mk-empty-icon"><Icon name="clipboard" size={44} /></div>
                <div className="mk-empty-title">Belum ada order survei</div>
                <div className="mk-empty-sub">Buat order pertamamu dan kami carikan surveyor terpercaya di kotamu.</div>
              </div>
            ) : (
              orders.map((order) => (
                <article key={order.id} className="mk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="mk-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mk-row" style={{ gap: 6, color: 'var(--ink-mute)', fontSize: 12, marginBottom: 5 }}>
                        <Icon name="map-pin" size={13} />
                        {[order.kecamatan, order.kota].filter(Boolean).join(', ')}
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: 0, letterSpacing: '-.01em' }}>
                        {order.kost_name}
                      </h3>
                      {order.agent_name && (
                        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
                          Surveyor: <strong style={{ color: 'var(--ink)' }}>{order.agent_name}</strong>
                        </div>
                      )}
                      {order.status === 'pending_payment' && (
                        <div className="mk-row" style={{ gap: 5, marginTop: 6, fontSize: 13, color: 'var(--warn)', fontWeight: 600 }}>
                          <Icon name="clock" size={13} />
                          Belum dibayar — {rp(order.price || PRICE)}
                        </div>
                      )}
                    </div>
                    <StatusPill status={order.status} />
                  </div>
                  <div className="mk-row" style={{ gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    {order.status !== 'pending_payment' && order.status !== 'finding_agent' && (
                      <button className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => navigate(`/survey-orders/${order.id}`)}>
                        <Icon name="message" size={14} /> Chat
                      </button>
                    )}
                    <button className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => navigate(`/survey-orders/${order.id}`)}>
                      {order.status === 'pending_payment' ? (<><Icon name="wallet" size={14} /> Bayar Sekarang</>) : 'Detail'}
                      {order.status !== 'pending_payment' && <Icon name="chevron-right" size={14} />}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {/* ── MOVING TAB ── */}
        {tab === 'moving' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {showMovingForm && (
              <div className="mk-card" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: '0 0 20px', letterSpacing: '-.01em' }}>
                  Order Pindahan
                </h3>
                {movingErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 16 }}>{movingErr}</div>}

                {/* Lokasi */}
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
                  Lokasi & Jarak
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="mk-label">Lokasi Jemput *</label>
                    <div className="mk-row" style={{ gap: 6 }}>
                      <div style={{ flex: 1 }}>
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
                      <button type="button" onClick={() => setShowPickupMap(true)}
                        className="mk-btn mk-btn-soft" style={{ padding: '10px 12px', flexShrink: 0 }}>
                        <Icon name="map-pin" size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mk-label">Lokasi Tujuan *</label>
                    <div className="mk-row" style={{ gap: 6 }}>
                      <div style={{ flex: 1 }}>
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
                      <button type="button" onClick={() => setShowDropoffMap(true)}
                        className="mk-btn mk-btn-soft" style={{ padding: '10px 12px', flexShrink: 0 }}>
                        <Icon name="map-pin" size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {showPickupMap && (
                  <LocationMapModal title="Pilih Lokasi Jemput" onClose={() => setShowPickupMap(false)}
                    onSelect={({ address, lat, lng }) => {
                      const coords = { lat, lng };
                      const updated = { ...movingForm, pickup_location: address };
                      setPickupCoords(coords); setMovingForm(updated);
                      if (dropoffCoords) fetchDistanceAndEstimate(coords, dropoffCoords, updated);
                    }} />
                )}
                {showDropoffMap && (
                  <LocationMapModal title="Pilih Lokasi Tujuan" onClose={() => setShowDropoffMap(false)}
                    onSelect={({ address, lat, lng }) => {
                      const coords = { lat, lng };
                      const updated = { ...movingForm, dropoff_location: address };
                      setDropoffCoords(coords); setMovingForm(updated);
                      if (pickupCoords) fetchDistanceAndEstimate(pickupCoords, coords, updated);
                    }} />
                )}

                <div style={{ marginBottom: 20 }}>
                  <label className="mk-label">Estimasi Jarak (km) *</label>
                  <input className="mk-input" type="number" min="0.1" step="0.1"
                    value={movingForm.distance_km} placeholder="Otomatis dihitung setelah pilih lokasi"
                    onChange={(e) => handleMovingChange({ distance_km: e.target.value })} />
                  {distanceLoading
                    ? <div className="mk-help">Menghitung jarak via OpenStreetMap...</div>
                    : pickupCoords && dropoffCoords && movingForm.distance_km
                      ? <div className="mk-help" style={{ color: 'var(--ok)' }}>{movingForm.distance_km} km — dihitung otomatis, bisa diubah manual</div>
                      : <div className="mk-help">Pilih kedua lokasi dari dropdown untuk hitung jarak otomatis</div>
                  }
                </div>

                {/* Kendaraan */}
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
                  Pilih Kendaraan
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {VEHICLES.map((v) => {
                    const isSelected = movingForm.vehicle_type === v.value;
                    return (
                      <div key={v.value} onClick={() => handleMovingChange({ vehicle_type: v.value })}
                        style={{
                          border: `1.5px solid ${isSelected ? 'var(--brand)' : 'var(--line-strong)'}`,
                          borderRadius: 'var(--r-sm)', padding: '11px 14px', cursor: 'pointer',
                          background: isSelected ? 'var(--brand-soft)' : 'var(--surface)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'all .12s',
                        }}>
                        <div>
                          <span style={{ fontWeight: 700, color: isSelected ? 'var(--brand-ink)' : 'var(--ink)' }}>{v.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--ink-mute)', marginLeft: 8 }}>{v.desc}</span>
                        </div>
                        <span style={{ fontSize: 12, color: isSelected ? 'var(--brand-ink)' : 'var(--ink-soft)', fontWeight: 600 }}>
                          {rp(v.rate)}/km
                        </span>
                      </div>
                    );
                  })}
                </div>

                {movingWarning?.map((w, i) => (
                  <div key={i} className="mk-alert mk-alert-warn" style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                    <Icon name="alert-circle" size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    {w}
                  </div>
                ))}

                {/* Info tambahan */}
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '16px 0 12px' }}>
                  Info Tambahan
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label className="mk-label">Lantai Jemput</label>
                    <input className="mk-input" type="number" min="1" max="50"
                      value={movingForm.pickup_floor}
                      onChange={(e) => handleMovingChange({ pickup_floor: e.target.value })} />
                  </div>
                  <div>
                    <label className="mk-label">Lantai Tujuan</label>
                    <input className="mk-input" type="number" min="1" max="50"
                      value={movingForm.dropoff_floor}
                      onChange={(e) => handleMovingChange({ dropoff_floor: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', marginBottom: 14 }}>
                  {[
                    { key: 'has_lift',       label: 'Ada Lift' },
                    { key: 'has_large_items', label: 'Barang besar (lemari, kasur spring)' },
                    { key: 'is_round_trip',  label: 'Pulang pergi (+50%)' },
                    { key: 'is_door_to_door', label: 'Door-to-Door (+Rp 20.000)' },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={movingForm[key]}
                        onChange={(e) => handleMovingChange({ [key]: e.target.checked })} />
                      {label}
                    </label>
                  ))}
                  {movingForm.vehicle_type !== 'MOTORCYCLE' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={movingForm.extra_helper}
                        onChange={(e) => handleMovingChange({ extra_helper: e.target.checked })} />
                      Extra Helper (+Rp 75.000)
                    </label>
                  )}
                </div>

                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '4px 0 12px' }}>
                  Info Operasional <span style={{ fontWeight: 400, fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>(membantu mover bersiap)</span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="mk-label">Estimasi Jumlah Barang</label>
                  <input className="mk-input" type="number" min="0" placeholder="Contoh: 15"
                    value={movingForm.estimated_item_count}
                    onChange={(e) => setMovingForm({ ...movingForm, estimated_item_count: e.target.value })} />
                  <div className="mk-help">Kira-kira berapa kardus / item</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', marginBottom: 12 }}>
                  {[
                    { key: 'has_parking',       label: 'Area parkir tersedia' },
                    { key: 'narrow_alley',      label: 'Gang sempit / akses sulit' },
                    { key: 'has_fragile',       label: 'Ada barang fragile' },
                    { key: 'needs_disassembly', label: 'Perlu bongkar pasang' },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={movingForm[key]}
                        onChange={(e) => setMovingForm({ ...movingForm, [key]: e.target.checked })} />
                      {label}
                    </label>
                  ))}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="mk-label">Catatan (opsional)</label>
                  <textarea className="mk-input" rows={2} value={movingForm.notes} maxLength={CHAR_LIMIT}
                    onChange={(e) => setMovingForm({ ...movingForm, notes: e.target.value })}
                    placeholder="Contoh: barang mudah pecah, parkir sempit, dll." />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="mk-label">Foto Barang * (min. 1, maks. {MAX_ATTACHMENTS} foto)</label>
                  <input type="file" className="mk-input" accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple onChange={handleMovingPhotosChange} />
                  {movingPhotoErr
                    ? <div className="mk-help" style={{ color: 'var(--err)' }}>{movingPhotoErr}</div>
                    : movingPhotos.length > 0
                      ? <div className="mk-help" style={{ color: 'var(--ok)' }}>{movingPhotos.length} foto dipilih</div>
                      : <div className="mk-help">Format: JPG, PNG, WebP · Maks. 5 MB/foto</div>
                  }
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="mk-label">Tanggal Pindah</label>
                  <input className="mk-input" type="date" value={movingForm.scheduled_date}
                    onChange={(e) => setMovingForm({ ...movingForm, scheduled_date: e.target.value })} />
                </div>

                {/* Estimasi harga */}
                {movingEstimating && <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 12 }}>Menghitung estimasi harga...</div>}
                {movingEstimate && (
                  <div style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--brand-ink)', fontSize: 14 }}>Estimasi Harga</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'grid', gap: 4 }}>
                      <div>Tarif dasar: <strong>{rp(movingEstimate.base_price)}</strong></div>
                      {movingEstimate.surcharge > 0 && <div>Surcharge: <strong>{rp(movingEstimate.surcharge)}</strong></div>}
                      {movingEstimate.addon_price > 0 && <div>Add-on: <strong>{rp(movingEstimate.addon_price)}</strong></div>}
                      {movingEstimate.round_trip_addon > 0 && <div>Pulang pergi (+50%): <strong>{rp(movingEstimate.round_trip_addon)}</strong></div>}
                    </div>
                    {movingEstimate.requires_review ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: 'var(--warn)', fontWeight: 700 }}>
                          Perkiraan: {rp(movingEstimate.price_min)} – {rp(movingEstimate.price_max)}
                        </div>
                        <div className="mk-help" style={{ color: 'var(--warn)' }}>Order ini perlu review admin sebelum dikonfirmasi</div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--brand-ink)' }}>
                        Total: {rp(movingEstimate.estimated_price)}
                      </div>
                    )}
                  </div>
                )}

                <button className="mk-btn mk-btn-primary" type="button" onClick={createMovingOrder} disabled={movingSubmitting}>
                  {movingSubmitting ? 'Membuat...' : (<><Icon name="arrow-right" size={15} /> Buat Order Pindahan</>)}
                </button>
              </div>
            )}

            {movingOrders.length === 0 ? (
              <div className="mk-empty">
                <div className="mk-empty-icon"><Icon name="truck" size={44} /></div>
                <div className="mk-empty-title">Belum ada order pindahan</div>
                <div className="mk-empty-sub">Buat order pertamamu dan dapatkan estimasi harga instan.</div>
              </div>
            ) : (
              movingOrders.map((o) => {
                const canPay    = o.status === 'PENDING_PAYMENT';
                const canCancel = !o.mover_id && ['PENDING_PAYMENT','INSTANT_CONFIRMED','REVIEW_REQUIRED','DRAFT'].includes(o.status);
                return (
                  <article key={o.id} className="mk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="mk-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Route display */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div className="mk-row" style={{ gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 'var(--r-pill)', background: 'var(--brand)', flexShrink: 0 }} />
                            <span className="mk-truncate" style={{ fontSize: 14, fontWeight: 600 }}>{o.pickup_location}</span>
                          </div>
                          <div style={{ marginLeft: 3, width: 1, height: 12, background: 'var(--line-strong)' }} />
                          <div className="mk-row" style={{ gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 'var(--r-pill)', border: '2px solid var(--brand)', flexShrink: 0 }} />
                            <span className="mk-truncate" style={{ fontSize: 14, fontWeight: 600 }}>{o.dropoff_location}</span>
                          </div>
                        </div>
                        <div className="mk-row" style={{ gap: 6, marginTop: 8, fontSize: 12, color: 'var(--ink-mute)', flexWrap: 'wrap' }}>
                          <Icon name="truck" size={13} /><span>{o.vehicle_type}</span>
                          <span>·</span><span>{o.distance_km} km</span>
                          {o.scheduled_date && <><span>·</span><span>{fmt(o.scheduled_date)}</span></>}
                        </div>
                        <div style={{ marginTop: 5, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--brand)' }}>
                          {rp(o.estimated_price)}
                        </div>
                        {o.mover_name && (
                          <div style={{ marginTop: 5, fontSize: 13, color: 'var(--ink-soft)' }}>
                            Mover: <strong>{o.mover_name}</strong>
                          </div>
                        )}
                        {o.status === 'INVALID' && o.invalid_reason && (
                          <div className="mk-row" style={{ gap: 5, marginTop: 5, fontSize: 12, color: 'var(--err)', fontWeight: 600 }}>
                            <Icon name="x-circle" size={13} />{o.invalid_reason}
                          </div>
                        )}
                      </div>
                      <StatusPill status={o.status} />
                    </div>

                    <div className="mk-row" style={{ gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                      {canPay && (
                        <button className="mk-btn mk-btn-primary mk-btn-sm"
                          onClick={async () => {
                            try { await api.post(`/api/moving-orders/${o.id}/pay`); await fetchData(); }
                            catch (err) { alert(err.response?.data?.error || 'Gagal bayar'); }
                          }}>
                          <Icon name="wallet" size={14} /> Bayar
                        </button>
                      )}
                      {canCancel && (
                        <button className="mk-btn mk-btn-danger mk-btn-sm"
                          onClick={async () => {
                            if (!confirm('Yakin ingin membatalkan order ini?')) return;
                            try { await api.post(`/api/moving-orders/${o.id}/cancel`); await fetchData(); }
                            catch (err) { alert(err.response?.data?.error || 'Gagal cancel'); }
                          }}>
                          Batalkan
                        </button>
                      )}
                      {!['DRAFT','INSTANT_CONFIRMED','REVIEW_REQUIRED','INVALID','CANCELLED'].includes(o.status) && (
                        <button className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => navigate(`/moving-orders/${o.id}`)}>
                          <Icon name="message" size={14} /> Chat
                        </button>
                      )}
                      <button className="mk-btn mk-btn-soft mk-btn-sm" onClick={() => navigate(`/moving-orders/${o.id}`)}>
                        Detail <Icon name="chevron-right" size={14} />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
