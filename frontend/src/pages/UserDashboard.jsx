import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import MapPicker from '../components/MapPicker';
import KotaSelect from '../components/KotaSelect';
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
  const [movingForm, setMovingForm] = useState({ pickup_location: '', delivery_location: '', description: '', scheduled_date: '', budget: '' });
  const [movingSubmitting, setMovingSubmitting] = useState(false);
  const [movingErr, setMovingErr] = useState('');

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
      kota: matchedKota, // auto-select from standardized list if matched
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
    setMovingSubmitting(true); setMovingErr('');
    try {
      await api.post('/api/moving-orders', {
        ...movingForm,
        budget: movingForm.budget ? parseInt(movingForm.budget) : null,
        scheduled_date: movingForm.scheduled_date || null,
      });
      setMovingForm({ pickup_location: '', delivery_location: '', description: '', scheduled_date: '', budget: '' });
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
            <button className={`btn ${showMovingForm ? 'btn-outline' : 'btn-primary'}`} onClick={() => setShowMovingForm(!showMovingForm)}>
              {showMovingForm ? 'Batal' : '+ Order Pindahan'}
            </button>
          </div>
          {showMovingForm && (
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #0f3460' }}>
              <div className="card-title">Buat Order Pindahan</div>
              {movingErr && <div className="alert alert-error">{movingErr}</div>}
              <form onSubmit={createMovingOrder}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Lokasi Jemput *</label>
                    <input className="form-control" value={movingForm.pickup_location} onChange={(e) => setMovingForm({ ...movingForm, pickup_location: e.target.value })} required placeholder="Alamat jemput" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lokasi Tujuan *</label>
                    <input className="form-control" value={movingForm.delivery_location} onChange={(e) => setMovingForm({ ...movingForm, delivery_location: e.target.value })} required placeholder="Alamat tujuan" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Budget (Rp)</label>
                    <input className="form-control" type="number" value={movingForm.budget} onChange={(e) => setMovingForm({ ...movingForm, budget: e.target.value })} placeholder="Opsional" min="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Pindah</label>
                    <input className="form-control" type="date" value={movingForm.scheduled_date} onChange={(e) => setMovingForm({ ...movingForm, scheduled_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Keterangan</label>
                  <textarea className="form-control" rows={2} value={movingForm.description} maxLength={CHAR_LIMIT} onChange={(e) => setMovingForm({ ...movingForm, description: e.target.value })} placeholder="Barang yang dipindahkan, dll." />
                  {movingForm.description.length >= CHAR_LIMIT && (
                    <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>⚠️ Maksimal {CHAR_LIMIT} karakter</span>
                  )}
                </div>
                <button className="btn btn-primary" type="submit" disabled={movingSubmitting}>
                  {movingSubmitting ? 'Membuat...' : 'Buat Order'}
                </button>
              </form>
            </div>
          )}
          {movingOrders.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🚚</div><p>Belum ada order pindahan.</p></div>
          ) : (
            movingOrders.map((o) => (
              <div key={o.id} className="order-card" style={{ borderLeftColor: '#0f3460' }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-card-title">{o.pickup_location} → {o.delivery_location}</div>
                    <div className="order-meta">Tanggal: {fmt(o.scheduled_date)} · Budget: {o.budget ? `Rp ${o.budget.toLocaleString('id-ID')}` : '—'}</div>
                    {o.mover_name && <div className="order-meta">Mover: {o.mover_name}</div>}
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="order-actions">
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
