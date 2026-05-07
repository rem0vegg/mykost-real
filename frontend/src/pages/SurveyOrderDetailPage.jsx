import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { getFileUrl } from '../services/api';
import useAuthStore from '../store/authStore';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';
import Chat from '../components/Chat';
import ReviewForm from '../components/ReviewForm';
import ComplaintForm from '../components/ComplaintForm';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const CHAR_LIMIT = 500;

export default function SurveyOrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const chatRef = useRef(null);
  const [finalizing, setFinalizing] = useState(false);

  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [surveyResult, setSurveyResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);

  // Refund
  const [refunding, setRefunding] = useState(false);

  // Survey submission (agent)
  const [surveyNotes, setSurveyNotes] = useState('');
  const [surveyPhotos, setSurveyPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [photoErr, setPhotoErr] = useState('');
  const fileRef = useRef();

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/api/survey-orders/${id}`);
      setOrder(data.order);
      setHistory(data.history);
      setSurveyResult(data.surveyResult);
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  // Generate previews when photos selected
  useEffect(() => {
    const urls = Array.from(surveyPhotos).map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [surveyPhotos]);

  const handlePay = async () => {
    setPaying(true); setPayErr('');
    try {
      const { data } = await api.post(`/api/survey-orders/${id}/pay`);
      setOrder(data.order);
      await fetchOrder();
      setShowPayModal(false);
    } catch (err) {
      setPayErr(err.response?.data?.error || 'Pembayaran gagal');
    } finally {
      setPaying(false);
    }
  };

  const handleRefund = async () => {
    if (!window.confirm('Yakin ingin membatalkan order dan meminta refund?')) return;
    setRefunding(true);
    try {
      const { data } = await api.post(`/api/survey-orders/${id}/refund`);
      setOrder(data.order);
      await fetchOrder();
    } catch {}
    setRefunding(false);
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      setPhotoErr('Maksimal 10 foto yang bisa diupload');
      e.target.value = '';
      setSurveyPhotos([]);
      return;
    }
    for (const file of files) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        setPhotoErr('Hanya file gambar (JPG, PNG, WebP) yang diizinkan');
        e.target.value = '';
        setSurveyPhotos([]);
        return;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setPhotoErr('Ukuran per file maksimal 5 MB');
        e.target.value = '';
        setSurveyPhotos([]);
        return;
      }
    }
    setPhotoErr('');
    setSurveyPhotos(files);
  };

  const finalizeOrder = async (action) => {
    setFinalizing(true);
    try {
      await api.post(`/api/survey-orders/${id}/finalize`, { action });
      if (action === 'proceed_moving') {
        // Simpan kost info ke sessionStorage agar UserDashboard prefill form pindahan
        sessionStorage.setItem('movingPrefill', JSON.stringify({
          dropoff_location: order.address,
          dropoff_latitude: order.latitude,
          dropoff_longitude: order.longitude,
          kost_name: order.kost_name,
        }));
        navigate('/dashboard?tab=moving');
      } else {
        await fetchOrder();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memproses');
    } finally {
      setFinalizing(false);
    }
  };

  const submitSurveyResult = async (e) => {
    e.preventDefault();
    if (!surveyNotes.trim()) return setSubmitErr('Catatan hasil survei wajib diisi');
    if (surveyPhotos.length === 0) return setSubmitErr('Minimal 1 foto wajib diunggah');
    setSubmitting(true); setSubmitErr('');
    try {
      const fd = new FormData();
      fd.append('notes', surveyNotes);
      surveyPhotos.forEach((f) => fd.append('photos', f));
      await api.post(`/api/survey-orders/${id}/survey-result`, fd);
      await fetchOrder();
      setSurveyNotes('');
      setSurveyPhotos([]);
    } catch (err) {
      setSubmitErr(err.response?.data?.error || 'Gagal mengirim hasil survei');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="spinner" />;
  if (!order) return null;

  const isOwner = order.user_id === user.id;
  const isAssignedAgent = user.role === 'agent' && order.agent_id === user.id;

  // Chat aktif setelah agent assigned, terus aktif sampai completed
  const chatPartnerId = (() => {
    if (['pending_payment', 'finding_agent', 'refunded', 'cancelled'].includes(order.status)) return null;
    if (user.role === 'user') return order.agent_id;
    if (isAssignedAgent) return order.user_id;
    return null;
  })();

  // Auto-scroll ke chat jika ada hash #chat (dari klik notif)
  useEffect(() => {
    if (location.hash === '#chat' && chatPartnerId && chatRef.current) {
      setTimeout(() => chatRef.current.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }, [location.hash, chatPartnerId]);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className="page">
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem' }}>
        ← Kembali
      </button>

      {/* ── PAYMENT PROMPT ─────────────────────────────────────────────── */}
      {isOwner && order.status === 'pending_payment' && (
        <div className="card" style={{ borderLeft: '4px solid #e94560', background: '#fff1f2', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>⏳ Menunggu Pembayaran</div>
              <div style={{ color: '#374151', fontSize: '0.9rem' }}>Selesaikan pembayaran untuk mulai mencari agent di area kota.</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e94560' }}>
                Rp {(order.price || 75000).toLocaleString('id-ID')}
              </div>
              <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => setShowPayModal(true)}>
                💳 Bayar Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FINDING AGENT ──────────────────────────────────────────────── */}
      {isOwner && order.status === 'finding_agent' && (
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>🔍 Mencari Agent...</div>
              <div style={{ color: '#374151', fontSize: '0.9rem' }}>
                Kami sedang mencari agent di <strong>{order.kota || 'kota Anda'}</strong>. Harap tunggu.
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleRefund} disabled={refunding}>
              {refunding ? 'Memproses...' : '🔙 Batalkan & Minta Refund'}
            </button>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div className="card-title">{order.kost_name}</div>
                <StatusBadge status={order.status} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.9rem', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <div><strong>Alamat:</strong> {order.address}</div>
              {order.kecamatan && <div><strong>Kecamatan:</strong> {order.kecamatan}</div>}
              {order.kota && <div><strong>Kota:</strong> {order.kota}</div>}
              {order.notes && <div><strong>Catatan:</strong> {order.notes}</div>}
              <div><strong>Dibuat:</strong> {fmt(order.created_at)}</div>
              <div>
                <strong>Harga:</strong> Rp {(order.price || 75000).toLocaleString('id-ID')} ·{' '}
                <span style={{ textTransform: 'capitalize' }}>{order.payment_status === 'paid' ? '✅ Lunas' : order.payment_status === 'refunded' ? '↩️ Dikembalikan' : '⏳ Belum Dibayar'}</span>
              </div>
              {order.agent_name && (
                <div><strong>Agent:</strong> {order.agent_name} {order.agent_phone && `· ${order.agent_phone}`}</div>
              )}
              {user.role === 'agent' && order.user_name && (
                <div><strong>Klien:</strong> {order.user_name} {order.user_phone && `· ${order.user_phone}`}</div>
              )}
            </div>

            {order.attachment_url && (() => {
              let urls;
              try { urls = JSON.parse(order.attachment_url); } catch { urls = [order.attachment_url]; }
              return (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Foto dari Klien ({urls.length})</div>
                  <div className="photo-grid">
                    {urls.map((url, i) => (
                      <img key={i} src={getFileUrl(url)} alt={`Lampiran ${i + 1}`} className="photo-thumb" onClick={() => window.open(getFileUrl(url))} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── SURVEY SUBMISSION FORM (assigned agent) ────────────────── */}
          {isAssignedAgent && order.status === 'assigned' && (
            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="card-title" style={{ marginBottom: '0.5rem' }}>📸 Kirim Hasil Survei</div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>Upload minimal 1 foto dan tulis catatan hasil survei kost.</p>

              {submitErr && <div className="alert alert-error">{submitErr}</div>}
              <form onSubmit={submitSurveyResult}>
                <div className="form-group">
                  <label className="form-label">Foto Hasil Survei * (maks. 10 foto)</label>
                  <input
                    ref={fileRef}
                    type="file"
                    className="form-control"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoChange}
                  />
                  {photoErr
                    ? <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>⚠️ {photoErr}</span>
                    : surveyPhotos.length > 0
                      ? <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>✓ {surveyPhotos.length} foto dipilih</span>
                      : <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Format: JPG, PNG, WebP · Maks. 10 foto · Maks. 5 MB/foto</span>
                  }
                  {previews.length > 0 && (
                    <div className="photo-grid" style={{ marginTop: '0.75rem' }}>
                      {previews.map((url, i) => (
                        <img key={i} src={url} alt={`Preview ${i + 1}`} className="photo-thumb" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan Hasil Survei *</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Tulis kondisi kost, fasilitas, harga sewa, dan informasi penting lainnya..."
                    value={surveyNotes}
                    maxLength={CHAR_LIMIT}
                    onChange={(e) => setSurveyNotes(e.target.value)}
                  />
                  {surveyNotes.length >= CHAR_LIMIT && (
                    <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>⚠️ Maksimal {CHAR_LIMIT} karakter</span>
                  )}
                </div>
                <button className="btn btn-success" type="submit" disabled={submitting}>
                  {submitting ? 'Mengirim...' : '✅ Kirim Hasil Survei'}
                </button>
              </form>
            </div>
          )}

          {/* ── SURVEY RESULTS (result_submitted atau completed) ───────── */}
          {['result_submitted','completed'].includes(order.status) && surveyResult && (
            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="card-title" style={{ marginBottom: '0.75rem' }}>✅ Hasil Survei</div>
              <div className="photo-grid" style={{ marginBottom: '1rem' }}>
                {(surveyResult.photos || []).map((p) => (
                  <img
                    key={p.id}
                    src={getFileUrl(p.photo_url)}
                    alt="Foto survei"
                    className="photo-thumb"
                    onClick={() => window.open(getFileUrl(p.photo_url))}
                    title="Klik untuk lihat penuh"
                  />
                ))}
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {surveyResult.notes}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#9ca3af' }}>
                Survei oleh {order.agent_name} · {fmt(surveyResult.created_at)}
              </div>
            </div>
          )}

          {/* ── FINALIZE: Pilihan setelah survey result ─────────────────── */}
          {isOwner && order.status === 'result_submitted' && (
            <div className="card" style={{ borderLeft: '4px solid #0f3460' }}>
              <div className="card-title" style={{ marginBottom: '0.5rem' }}>Apa langkah Anda selanjutnya?</div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                Anda sudah melihat hasil survei. Pilih salah satu untuk menyelesaikan order ini.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button className="btn btn-success" disabled={finalizing}
                  onClick={() => finalizeOrder('complete')}>
                  ✅ Selesaikan Order
                </button>
                <button className="btn btn-primary" disabled={finalizing}
                  onClick={() => finalizeOrder('proceed_moving')}>
                  🚚 Lanjut Pesan Pindahan
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                "Lanjut Pesan Pindahan" akan langsung membuka form order pindahan dengan alamat kost sebagai tujuan.
              </p>
            </div>
          )}

          {/* ── REVIEW & COMPLAINT (setelah completed) ──────────────────── */}
          {isOwner && order.status === 'completed' && order.agent_id && (
            <>
              <ReviewForm
                orderId={order.id}
                orderType="survey"
                revieweeName={order.agent_name}
              />
              <ComplaintForm orderId={order.id} orderType="survey" />
            </>
          )}

          {/* Timeline */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '1rem' }}>Riwayat Status</div>
            <StatusTimeline history={history} />
          </div>
        </div>

        {/* ── RIGHT COLUMN: CHAT ─────────────────────────────────────────── */}
        <div className="card" ref={chatRef} id="chat">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Chat</div>
          {chatPartnerId ? (
            <Chat orderId={id} toUserId={chatPartnerId} orderType="survey" />
          ) : (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div className="empty-state-icon">💬</div>
              <p style={{ fontSize: '0.85rem' }}>
                {order.status === 'pending_payment' ? 'Chat tersedia setelah pembayaran dan agent ditemukan.'
                  : order.status === 'finding_agent' ? 'Chat tersedia setelah agent menerima order.'
                  : 'Chat tidak tersedia.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── PAYMENT MODAL ──────────────────────────────────────────────── */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => !paying && setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Konfirmasi Pembayaran</div>
            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#374151' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                <span>Survey Kost — {order.kost_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                <span>Biaya Survey</span>
                <span>Rp {(order.price || 75000).toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 700, fontSize: '1.05rem' }}>
                <span>Total</span>
                <span style={{ color: '#e94560' }}>Rp {(order.price || 75000).toLocaleString('id-ID')}</span>
              </div>
            </div>
            {payErr && <div className="alert alert-error">{payErr}</div>}
            <p style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '1rem' }}>
              Dengan mengklik "Bayar", Anda menyetujui pembayaran biaya survey. Jika tidak ada agent tersedia, dana akan dikembalikan.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPayModal(false)} disabled={paying}>Batal</button>
              <button className="btn btn-primary" onClick={handlePay} disabled={paying}>
                {paying ? 'Memproses...' : `💳 Bayar Rp ${(order.price || 75000).toLocaleString('id-ID')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
