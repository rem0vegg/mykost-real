import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';
import Chat from '../components/Chat';
import ExpandableText, { maskPhone } from '../components/ExpandableText';

const VEHICLE_LABEL = { MOTORCYCLE: '🏍️ Motor', VAN: '🚐 Van', PICKUP_BOX: '🚛 Pickup Box' };

function InfoCell({ label, value }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
      <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontWeight: 700, marginTop: '0.15rem', fontSize: '0.92rem' }}>{value}</div>
    </div>
  );
}

function MapsLink({ lat, lng, label = 'Buka di Maps' }) {
  if (!lat || !lng) return null;
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank" rel="noopener noreferrer"
      style={{ fontSize: '0.78rem', color: '#0f3460', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
    >
      🗺️ {label}
    </a>
  );
}

const MISMATCH_REASONS = [
  { value: 'OVER_CAPACITY',      label: 'Barang melebihi kapasitas kendaraan' },
  { value: 'BARANG_TIDAK_SESUAI',label: 'Jenis barang tidak sesuai deskripsi' },
  { value: 'TIDAK_AMAN',         label: 'Kondisi barang / rute tidak aman' },
];

const VEHICLES = ['MOTORCYCLE','VAN','PICKUP_BOX'];

export default function MovingOrderDetailPage() {
  const { id }      = useParams();
  const { user }    = useAuthStore();
  const navigate    = useNavigate();

  const [order,   setOrder]   = useState(null);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mover: update status
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [statusForm,     setStatusForm]     = useState({ status: '', note: '' });
  const [updating,       setUpdating]       = useState(false);
  const [statusErr,      setStatusErr]      = useState('');

  // Mover: report mismatch
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm,     setReportForm]     = useState({ reason: '', notes: '' });
  const [reportPhoto,    setReportPhoto]    = useState(null);
  const [reporting,      setReporting]      = useState(false);
  const [reportErr,      setReportErr]      = useState('');
  const [reportResult,   setReportResult]   = useState(null);

  // Mover: upload bukti
  const [evidenceUploading, setEvidenceUploading] = useState({ pickup: false, delivery: false });

  // User: rebook
  const [showRebookForm, setShowRebookForm]   = useState(false);
  const [rebookVehicle,  setRebookVehicle]    = useState('VAN');
  const [rebookDate,     setRebookDate]       = useState('');
  const [rebooking,      setRebooking]        = useState(false);
  const [rebookErr,      setRebookErr]        = useState('');

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/api/moving-orders/${id}`);
      setOrder(data.order);
      setHistory(data.history || []);
      setReports(data.driver_reports || []);
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const updateStatus = async (e) => {
    e.preventDefault();
    setUpdating(true); setStatusErr('');
    try {
      const payload = { status: statusForm.status, note: statusForm.note || undefined };
      await api.put(`/api/moving-orders/${id}/status`, payload);
      setShowStatusForm(false);
      setStatusForm({ status: '', note: '' });
      await fetchOrder();
    } catch (err) {
      setStatusErr(err.response?.data?.error || 'Gagal update status');
    } finally {
      setUpdating(false);
    }
  };

  const reportMismatch = async (e) => {
    e.preventDefault();
    if (!reportPhoto) return setReportErr('Foto bukti wajib diupload');
    setReporting(true); setReportErr('');
    try {
      const fd = new FormData();
      fd.append('reason', reportForm.reason);
      if (reportForm.notes) fd.append('notes', reportForm.notes);
      fd.append('photo', reportPhoto);
      const { data } = await api.post(`/api/moving-orders/${id}/report`, fd);
      setReportResult(data);
      setShowReportForm(false);
      await fetchOrder();
    } catch (err) {
      setReportErr(err.response?.data?.error || 'Gagal melaporkan mismatch');
    } finally {
      setReporting(false);
    }
  };

  const rebookOrder = async (e) => {
    e.preventDefault();
    setRebooking(true); setRebookErr('');
    try {
      const payload = { vehicle_type: rebookVehicle };
      if (rebookDate) payload.scheduled_date = new Date(rebookDate).toISOString();
      const { data } = await api.post(`/api/moving-orders/${id}/rebook`, payload);
      navigate(`/moving-orders/${data.order.id}`);
    } catch (err) {
      setRebookErr(err.response?.data?.error || 'Gagal rebook');
    } finally {
      setRebooking(false);
    }
  };

  if (loading) return <div className="spinner" />;
  if (!order)  return null;

  const isMover   = user.role === 'mover' && order.mover_id === user.id;
  const isUser    = user.role === 'user'  && order.user_id  === user.id;
  const canAccept = user.role === 'mover' && !order.mover_id && order.status === 'INSTANT_CONFIRMED' && order.payment_status === 'paid';
  const otherUser = user.role === 'user'  ? order.mover_id  : order.user_id;
  const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const rp  = (n) => n != null ? `Rp ${Number(n).toLocaleString('id-ID')}` : '—';

  const canUpdateStatus  = isMover && ['ACCEPTED','ON_GOING'].includes(order.status);
  const canReportMismatch= isMover && ['ACCEPTED','ON_GOING'].includes(order.status);
  const canRebook        = isUser  && order.status === 'INVALID';
  const canPay           = isUser  && order.payment_status === 'pending' && !['CANCELLED','INVALID','COMPLETED'].includes(order.status);
  const canCancel        = isUser  && !order.mover_id && ['INSTANT_CONFIRMED','REVIEW_REQUIRED','DRAFT'].includes(order.status);

  const payOrder = async () => {
    try {
      await api.post(`/api/moving-orders/${id}/pay`);
      await fetchOrder();
    } catch (err) { alert(err.response?.data?.error || 'Gagal bayar'); }
  };

  const cancelOrder = async () => {
    if (!confirm('Yakin ingin membatalkan order ini?')) return;
    try {
      await api.post(`/api/moving-orders/${id}/cancel`);
      await fetchOrder();
    } catch (err) { alert(err.response?.data?.error || 'Gagal cancel'); }
  };

  const acceptJob = async () => {
    try {
      await api.post(`/api/moving-orders/${id}/accept`);
      await fetchOrder();
    } catch (err) { alert(err.response?.data?.error || 'Gagal accept job'); }
  };

  const uploadEvidence = async (e, stage) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length > 5) { alert('Maksimal 5 foto'); e.target.value = ''; return; }
    setEvidenceUploading((p) => ({ ...p, [stage]: true }));
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('photos', f));
      await api.post(`/api/moving-orders/${id}/evidence?stage=${stage}`, fd);
      await fetchOrder();
      e.target.value = '';
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal upload bukti');
    } finally {
      setEvidenceUploading((p) => ({ ...p, [stage]: false }));
    }
  };

  return (
    <div className="page">
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem' }}>
        ← Kembali
      </button>

      <div className="grid-2">
        {/* Kolom kiri */}
        <div>
          {/* Info order */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Detail Order Pindahan</div>
              <StatusBadge status={order.status} />
            </div>

            {/* Quick info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
              <InfoCell label="Tanggal"   value={fmt(order.scheduled_date)} />
              <InfoCell label="Kendaraan" value={VEHICLE_LABEL[order.vehicle_type] || order.vehicle_type} />
              <InfoCell label="Jarak"     value={`${order.distance_km} km`} />
            </div>

            {/* Lokasi */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f3460', marginBottom: '0.4rem' }}>📍 Lokasi Pickup</div>
              {isMover || (isUser && order.mover_id) ? (
                <>
                  <div style={{ fontSize: '0.88rem', wordBreak: 'break-word' }}>{order.pickup_location}</div>
                  <MapsLink lat={order.pickup_latitude} lng={order.pickup_longitude} />
                </>
              ) : (
                <div style={{ fontSize: '0.88rem' }}>
                  <ExpandableText text={order.pickup_location} limit={70} />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f3460', marginBottom: '0.4rem' }}>🎯 Lokasi Tujuan</div>
              {isMover || (isUser && order.mover_id) ? (
                <>
                  <div style={{ fontSize: '0.88rem', wordBreak: 'break-word' }}>{order.dropoff_location}</div>
                  <MapsLink lat={order.dropoff_latitude} lng={order.dropoff_longitude} />
                </>
              ) : (
                <div style={{ fontSize: '0.88rem' }}>
                  <ExpandableText text={order.dropoff_location} limit={70} />
                </div>
              )}
            </div>

            {/* Detail Operasional */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f3460', marginBottom: '0.4rem' }}>📋 Detail Operasional</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 1rem', fontSize: '0.85rem' }}>
                <div>Lantai Pickup: <strong>Lt. {order.pickup_floor}</strong></div>
                <div>Lantai Tujuan: <strong>Lt. {order.dropoff_floor}</strong></div>
                <div>Lift: <strong>{order.has_lift ? 'Ada' : 'Tidak'}</strong></div>
                {order.estimated_item_count != null && (
                  <div>Estimasi Barang: <strong>{order.estimated_item_count} item</strong></div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                {order.is_round_trip      && <span className="op-tag">🔁 Pulang Pergi</span>}
                {order.is_door_to_door    && <span className="op-tag">🚪 Door-to-Door</span>}
                {order.has_large_items    && <span className="op-tag">📦 Barang Besar</span>}
                {order.has_fragile        && <span className="op-tag op-tag-warn">⚠️ Fragile</span>}
                {order.needs_disassembly  && <span className="op-tag">🔧 Bongkar Pasang</span>}
                {order.has_parking        && <span className="op-tag op-tag-good">🅿️ Parkir Tersedia</span>}
                {order.narrow_alley       && <span className="op-tag op-tag-warn">⚠️ Gang Sempit</span>}
              </div>
            </div>

            {/* Catatan */}
            {order.notes && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f3460', marginBottom: '0.4rem' }}>📝 Catatan</div>
                <div style={{ fontSize: '0.88rem' }}>
                  <ExpandableText text={order.notes} limit={150} />
                </div>
              </div>
            )}

            {/* Kontak */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f3460', marginBottom: '0.4rem' }}>👤 Kontak</div>
              {isUser && order.mover_id && (
                <div style={{ fontSize: '0.88rem' }}>
                  <strong>Mover:</strong> {order.mover_name}
                  {order.mover_phone && <> · <a href={`tel:${order.mover_phone}`} style={{ color: '#0f3460', fontWeight: 600 }}>{order.mover_phone}</a></>}
                </div>
              )}
              {isUser && !order.mover_id && (
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Belum ada mover. Kontak akan muncul setelah mover menerima order.</div>
              )}
              {user.role === 'mover' && (
                <div style={{ fontSize: '0.88rem' }}>
                  <strong>Pemesan:</strong> {order.user_name}
                  {order.user_phone && (
                    isMover
                      ? <> · <a href={`tel:${order.user_phone}`} style={{ color: '#0f3460', fontWeight: 600 }}>{order.user_phone}</a></>
                      : <> · <span style={{ color: '#6b7280' }}>{maskPhone(order.user_phone)} <span style={{ fontSize: '0.75rem' }}>(akan terbuka setelah accept)</span></span></>
                  )}
                </div>
              )}
            </div>

            {/* Pricing */}
            <div style={{ marginTop: '1rem', background: '#f8faff', borderRadius: 8, padding: '0.75rem', fontSize: '0.88rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: '#0f3460' }}>Rincian Harga</div>
              <div>Tarif dasar: <strong>{rp(order.base_price)}</strong></div>
              {order.surcharge > 0       && <div>Surcharge: <strong>{rp(order.surcharge)}</strong></div>}
              {order.addon_price > 0     && <div>Add-on: <strong>{rp(order.addon_price)}</strong></div>}
              {order.is_round_trip       && <div>Pulang pergi (+50%): <strong>termasuk</strong></div>}
              <div style={{ marginTop: '0.35rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.35rem' }}>
                <span style={{ color: '#0f3460', fontWeight: 800, fontSize: '1rem' }}>
                  Total: {rp(order.estimated_price)}
                </span>
                {order.payment_status === 'paid' && (
                  <span style={{ marginLeft: '0.5rem', color: '#10b981', fontSize: '0.78rem', fontWeight: 700 }}>✓ LUNAS</span>
                )}
              </div>
            </div>

            {/* Foto barang */}
            {order.photo_urls?.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem' }}>📸 Foto Barang (dari user)</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {order.photo_urls.map((url, i) => (
                    <a key={i} href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer">
                      <img src={`http://localhost:5000${url}`} alt="barang"
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Bukti Pickup & Delivery (mover upload, semua orang lihat) */}
            {['ACCEPTED','ON_GOING','COMPLETED'].includes(order.status) && (
              <>
                {(isMover || (order.pickup_photo_urls?.length > 0)) && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem' }}>📦 Bukti Pickup</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {(order.pickup_photo_urls || []).map((url, i) => (
                        <a key={i} href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer">
                          <img src={`http://localhost:5000${url}`} alt="pickup"
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #d1fae5' }} />
                        </a>
                      ))}
                      {isMover && (order.pickup_photo_urls?.length || 0) === 0 && (
                        <div style={{ fontSize: '0.82rem', color: '#9ca3af', alignSelf: 'center' }}>Belum ada foto bukti pickup.</div>
                      )}
                    </div>
                    {isMover && order.status !== 'COMPLETED' && (
                      <label className="btn btn-outline btn-sm" style={{ display: 'inline-block' }}>
                        {evidenceUploading.pickup ? 'Mengunggah...' : '+ Upload Foto Pickup'}
                        <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                          onChange={(e) => uploadEvidence(e, 'pickup')} disabled={evidenceUploading.pickup} />
                      </label>
                    )}
                  </div>
                )}

                {(isMover || (order.delivery_photo_urls?.length > 0)) && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem' }}>🏁 Bukti Delivery</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {(order.delivery_photo_urls || []).map((url, i) => (
                        <a key={i} href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer">
                          <img src={`http://localhost:5000${url}`} alt="delivery"
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #d1fae5' }} />
                        </a>
                      ))}
                      {isMover && (order.delivery_photo_urls?.length || 0) === 0 && (
                        <div style={{ fontSize: '0.82rem', color: '#9ca3af', alignSelf: 'center' }}>Belum ada foto bukti delivery.</div>
                      )}
                    </div>
                    {isMover && order.status !== 'COMPLETED' && (
                      <label className="btn btn-outline btn-sm" style={{ display: 'inline-block' }}>
                        {evidenceUploading.delivery ? 'Mengunggah...' : '+ Upload Foto Delivery'}
                        <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                          onChange={(e) => uploadEvidence(e, 'delivery')} disabled={evidenceUploading.delivery} />
                      </label>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Invalid info */}
            {order.status === 'INVALID' && (
              <div style={{ marginTop: '1rem', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>❌ Order Dibatalkan (Mismatch)</div>
                <div style={{ fontSize: '0.88rem' }}>Alasan: <strong>{order.invalid_reason}</strong></div>
              </div>
            )}

            {/* Action buttons */}
            {(canPay || canCancel || canAccept) && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {canPay && (
                  <button className="btn btn-primary btn-sm" onClick={payOrder}>
                    💳 Bayar Sekarang — Rp {Number(order.estimated_price).toLocaleString('id-ID')}
                  </button>
                )}
                {canCancel && (
                  <button className="btn btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={cancelOrder}>
                    Batalkan Order
                  </button>
                )}
                {canAccept && (
                  <button className="btn btn-success btn-sm" onClick={acceptJob}>
                    ✓ Ambil Job Ini
                  </button>
                )}
              </div>
            )}
            {isUser && order.payment_status === 'paid' && !order.mover_id && (
              <div style={{ marginTop: '1rem', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8, padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: '#15803d' }}>
                ✓ Pembayaran terkonfirmasi — menunggu mover mengambil order ini
              </div>
            )}
          </div>

          {/* Mover: Update Status */}
          {canUpdateStatus && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-title" style={{ marginBottom: '0.75rem' }}>Update Status</div>
              {!showStatusForm ? (
                <button className="btn btn-primary btn-sm" onClick={() => setShowStatusForm(true)}>Update Status</button>
              ) : (
                <form onSubmit={updateStatus}>
                  {statusErr && <div className="alert alert-error">{statusErr}</div>}
                  <div className="form-group">
                    <label className="form-label">Status Baru</label>
                    <select className="form-control" value={statusForm.status}
                      onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })} required>
                      <option value="">Pilih status...</option>
                      {order.status === 'ACCEPTED' && <option value="ON_GOING">ON_GOING (Mulai angkut)</option>}
                      {order.status === 'ON_GOING' && <option value="COMPLETED">COMPLETED (Selesai)</option>}
                    </select>
                  </div>
                  {statusForm.status === 'COMPLETED' && (
                    <div style={{ background: '#f0f4ff', borderRadius: 6, padding: '0.6rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#0f3460' }}>
                      User sudah membayar <strong>Rp {Number(order.estimated_price).toLocaleString('id-ID')}</strong> di awal — tidak perlu input harga.
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Catatan (opsional)</label>
                    <textarea className="form-control" rows={2} value={statusForm.note}
                      onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" type="submit" disabled={updating}>
                      {updating ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowStatusForm(false)}>Batal</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Mover: Report Mismatch */}
          {canReportMismatch && (
            <div className="card" style={{ marginTop: '1rem', borderLeft: '3px solid #ef4444' }}>
              <div className="card-title" style={{ marginBottom: '0.75rem', color: '#dc2626' }}>⚠️ Laporkan Mismatch</div>
              {reportResult && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '0.6rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <strong>Laporan terkirim.</strong> {reportResult.recommended_vehicle && `Kendaraan yang disarankan: ${reportResult.recommended_vehicle}`}
                </div>
              )}
              {!showReportForm ? (
                <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5' }}
                  onClick={() => setShowReportForm(true)}>
                  Laporkan Kondisi Tidak Sesuai
                </button>
              ) : (
                <form onSubmit={reportMismatch}>
                  {reportErr && <div className="alert alert-error">{reportErr}</div>}
                  <div className="form-group">
                    <label className="form-label">Alasan *</label>
                    <select className="form-control" value={reportForm.reason}
                      onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })} required>
                      <option value="">Pilih alasan...</option>
                      {MISMATCH_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Foto Bukti *</label>
                    <input type="file" className="form-control" accept="image/*"
                      onChange={(e) => setReportPhoto(e.target.files[0])} required style={{ padding: '0.4rem' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Keterangan tambahan (opsional)</label>
                    <textarea className="form-control" rows={2} value={reportForm.notes}
                      onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-sm" type="submit" disabled={reporting}
                      style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 1rem' }}>
                      {reporting ? 'Mengirim...' : 'Kirim Laporan'}
                    </button>
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowReportForm(false)}>Batal</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Driver reports history */}
          {reports.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-title" style={{ marginBottom: '0.75rem' }}>Laporan Driver</div>
              {reports.map((r) => (
                <div key={r.id} style={{ background: '#fef2f2', borderRadius: 6, padding: '0.6rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <div><strong>Alasan:</strong> {r.reason}</div>
                  {r.notes && <div><strong>Catatan:</strong> {r.notes}</div>}
                  <div><strong>Waktu:</strong> {new Date(r.created_at).toLocaleString('id-ID')}</div>
                  {r.photo_url && (
                    <img src={`http://localhost:5000${r.photo_url}`} alt="bukti"
                      style={{ marginTop: '0.5rem', width: 120, height: 80, objectFit: 'cover', borderRadius: 4 }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* User: Rebook */}
          {canRebook && (
            <div className="card" style={{ marginTop: '1rem', borderLeft: '3px solid #0f3460' }}>
              <div className="card-title" style={{ marginBottom: '0.75rem' }}>Pesan Ulang (Rebook)</div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                Order dibatalkan karena mismatch. Pilih kendaraan yang sesuai dan pesan ulang.
              </p>
              {rebookErr && <div className="alert alert-error">{rebookErr}</div>}
              {!showRebookForm ? (
                <button className="btn btn-primary btn-sm" onClick={() => setShowRebookForm(true)}>Rebook Sekarang</button>
              ) : (
                <form onSubmit={rebookOrder}>
                  <div className="form-group">
                    <label className="form-label">Pilih Kendaraan *</label>
                    <select className="form-control" value={rebookVehicle}
                      onChange={(e) => setRebookVehicle(e.target.value)} required>
                      {VEHICLES.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Baru (opsional)</label>
                    <input className="form-control" type="date" value={rebookDate}
                      onChange={(e) => setRebookDate(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" type="submit" disabled={rebooking}>
                      {rebooking ? 'Memproses...' : 'Buat Order Baru →'}
                    </button>
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowRebookForm(false)}>Batal</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Status History */}
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>Riwayat Status</div>
            <StatusTimeline history={history} />
          </div>
        </div>

        {/* Kolom kanan: Chat */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Chat</div>
          {otherUser ? (
            <Chat orderId={id} toUserId={otherUser} orderType="moving" />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <p>Chat tersedia setelah mover menerima order ini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
