import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';
import Chat from '../components/Chat';

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
  const [statusForm,     setStatusForm]     = useState({ status: '', note: '', final_price: '' });
  const [updating,       setUpdating]       = useState(false);
  const [statusErr,      setStatusErr]      = useState('');

  // Mover: report mismatch
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm,     setReportForm]     = useState({ reason: '', notes: '' });
  const [reportPhoto,    setReportPhoto]    = useState(null);
  const [reporting,      setReporting]      = useState(false);
  const [reportErr,      setReportErr]      = useState('');
  const [reportResult,   setReportResult]   = useState(null);

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
      if (statusForm.status === 'COMPLETED' && statusForm.final_price) {
        payload.final_price = parseInt(statusForm.final_price);
      }
      await api.put(`/api/moving-orders/${id}/status`, payload);
      setShowStatusForm(false);
      setStatusForm({ status: '', note: '', final_price: '' });
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div className="card-title">Detail Order Pindahan</div>
                <StatusBadge status={order.status} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.9rem' }}>
              <div><strong>Pickup:</strong> {order.pickup_location}</div>
              <div><strong>Tujuan:</strong> {order.dropoff_location}</div>
              <div><strong>Jarak:</strong> {order.distance_km} km</div>
              <div><strong>Tipe:</strong> {order.move_type}</div>
              <div><strong>Kendaraan:</strong> {order.vehicle_type}</div>
              <div><strong>Lantai Pickup:</strong> Lt. {order.pickup_floor} {order.has_lift ? '(ada lift)' : ''}</div>
              <div><strong>Lantai Tujuan:</strong> Lt. {order.dropoff_floor}</div>
              {order.is_round_trip    && <div>✓ Pulang Pergi (PP)</div>}
              {order.is_door_to_door  && <div>✓ Door-to-Door</div>}
              {order.has_large_items  && <div>⚠️ Ada barang besar</div>}
              {order.notes && <div><strong>Catatan:</strong> {order.notes}</div>}
              <div><strong>Tanggal:</strong> {fmt(order.scheduled_date)}</div>
              {order.mover_id && <div><strong>Mover:</strong> {order.mover_name} {order.mover_phone && `(${order.mover_phone})`}</div>}
              {isMover && <div><strong>Pemesan:</strong> {order.user_name} {order.user_phone && `(${order.user_phone})`}</div>}
            </div>

            {/* Pricing */}
            <div style={{ marginTop: '1rem', background: '#f8faff', borderRadius: 8, padding: '0.75rem', fontSize: '0.88rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: '#0f3460' }}>Rincian Harga</div>
              <div>Tarif dasar: <strong>{rp(order.base_price)}</strong></div>
              {order.surcharge > 0   && <div>Surcharge: <strong>{rp(order.surcharge)}</strong></div>}
              {order.addon_price > 0 && <div>Add-on: <strong>{rp(order.addon_price)}</strong></div>}
              <div style={{ marginTop: '0.35rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.35rem' }}>
                {order.requires_review && order.price_min ? (
                  <span style={{ color: '#92400e', fontWeight: 700 }}>
                    Estimasi: {rp(order.price_min)} – {rp(order.price_max)}
                  </span>
                ) : (
                  <span style={{ color: '#0f3460', fontWeight: 800, fontSize: '1rem' }}>
                    Total: {rp(order.estimated_price)}
                  </span>
                )}
              </div>
              {order.final_price && (
                <div style={{ color: '#059669', fontWeight: 700, marginTop: '0.25rem' }}>
                  Harga Final: {rp(order.final_price)}
                </div>
              )}
              {order.requires_review && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: '#b45309' }}>
                  ⚠️ Order ini perlu review admin sebelum dikonfirmasi
                </div>
              )}
            </div>

            {/* Foto barang */}
            {order.photo_urls?.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem' }}>Foto Barang</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {order.photo_urls.map((url, i) => (
                    <img key={i} src={`http://localhost:5000${url}`} alt="barang"
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Invalid info */}
            {order.status === 'INVALID' && (
              <div style={{ marginTop: '1rem', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>❌ Order Dibatalkan (Mismatch)</div>
                <div style={{ fontSize: '0.88rem' }}>Alasan: <strong>{order.invalid_reason}</strong></div>
              </div>
            )}

            {/* Payment & Cancel actions untuk user */}
            {(canPay || canCancel) && (
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
                    <div className="form-group">
                      <label className="form-label">Harga Final (Rp) *</label>
                      <input className="form-control" type="number" min="0"
                        value={statusForm.final_price}
                        onChange={(e) => setStatusForm({ ...statusForm, final_price: e.target.value })}
                        placeholder="Masukkan harga final" required />
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
