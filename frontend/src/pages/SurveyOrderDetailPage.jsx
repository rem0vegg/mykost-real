import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { getFileUrl } from '../services/api';
import useAuthStore from '../store/authStore';
import StatusTimeline from '../components/StatusTimeline';
import Chat from '../components/Chat';
import ReviewForm from '../components/ReviewForm';
import ComplaintForm from '../components/ComplaintForm';
import Icon from '../components/Icon';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const CHAR_LIMIT = 500;

const SURVEY_STATUS = {
  pending_payment:  { cls: 'mk-pill mk-pill-warn', label: 'Menunggu Pembayaran' },
  finding_agent:    { cls: 'mk-pill mk-pill-info', label: 'Mencari Agent' },
  assigned:         { cls: 'mk-pill mk-pill-info', label: 'Sudah Ditugaskan' },
  result_submitted: { cls: 'mk-pill mk-pill-warn', label: 'Hasil Survei Siap' },
  completed:        { cls: 'mk-pill mk-pill-ok',   label: 'Selesai' },
  refunded:         { cls: 'mk-pill',              label: 'Dana Dikembalikan' },
  cancelled:        { cls: 'mk-pill mk-pill-err',  label: 'Dibatalkan' },
};

function StatusPill({ status }) {
  const cfg = SURVEY_STATUS[status] || { cls: 'mk-pill mk-pill-info', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

export default function SurveyOrderDetailPage() {
  const { id } = useParams();
  const { user, capabilities } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const chatRef = useRef(null);
  const fileRef = useRef();
  const [finalizing, setFinalizing] = useState(false);

  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [surveyResult, setSurveyResult] = useState(null);
  const [loading, setLoading] = useState(true);


  const [refunding, setRefunding] = useState(false);

  const [surveyNotes, setSurveyNotes] = useState('');
  const [surveyPhotos, setSurveyPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [photoErr, setPhotoErr] = useState('');

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

  useEffect(() => {
    const urls = Array.from(surveyPhotos).map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [surveyPhotos]);

  useEffect(() => {
    if (location.hash === '#chat' && order && chatRef.current) {
      setTimeout(() => chatRef.current.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }, [location.hash, order]);


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
      e.target.value = ''; setSurveyPhotos([]); return;
    }
    for (const file of files) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        setPhotoErr('Hanya file gambar (JPG, PNG, WebP) yang diizinkan');
        e.target.value = ''; setSurveyPhotos([]); return;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setPhotoErr('Ukuran per file maksimal 5 MB');
        e.target.value = ''; setSurveyPhotos([]); return;
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

  if (loading) return <div className="mk-loading"><div className="mk-spinner" /></div>;
  if (!order) return null;

  const isOwner = order.user_id === user.id;
  const hasSurveyorCap = (capabilities || []).some(c => c.capability === 'surveyor' && c.status === 'active');
  const isAssignedAgent = (user.role === 'agent' || hasSurveyorCap) && order.agent_id === user.id;

  const chatPartnerId = (() => {
    if (['pending_payment', 'finding_agent', 'refunded', 'cancelled'].includes(order.status)) return null;
    if (user.role === 'user') return order.agent_id;
    if (isAssignedAgent) return order.user_id;
    return null;
  })();

  const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  return (
    <div className="mk-page">
      <button className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: 20 }}>
        <Icon name="arrow-left" size={15} /> Kembali
      </button>

      {/* Payment prompt */}
      {isOwner && order.status === 'pending_payment' && (
        <div className="mk-alert mk-alert-warn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Menunggu Pembayaran</div>
            <div style={{ fontSize: 13 }}>Selesaikan pembayaran untuk mulai mencari agent di area kota.</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
              {rp(order.price || 75000)}
            </div>
            <button className="mk-btn mk-btn-primary mk-btn-sm" style={{ marginTop: 6 }} onClick={() => navigate(`/checkout/survey/${id}`)}>
              <Icon name="wallet" size={14} /> Bayar Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Finding agent */}
      {isOwner && order.status === 'finding_agent' && (
        <div className="mk-alert mk-alert-warn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Mencari Agent...</div>
            <div style={{ fontSize: 13 }}>Kami sedang mencari agent di <strong>{order.kota || 'kota Anda'}</strong>. Harap tunggu.</div>
          </div>
          <button
            className="mk-btn mk-btn-ghost mk-btn-sm"
            onClick={handleRefund}
            disabled={refunding}
            style={{ color: 'var(--err)', flexShrink: 0 }}
          >
            {refunding ? 'Memproses...' : 'Batalkan & Refund'}
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Order info */}
          <div className="mk-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: 0, lineHeight: 1.3 }}>
                {order.kost_name}
              </h2>
              <StatusPill status={order.status} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
              <div className="mk-row" style={{ gap: 8, alignItems: 'flex-start' }}>
                <Icon name="map-pin" size={15} style={{ color: 'var(--ink-mute)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ wordBreak: 'break-word' }}>{order.address}</span>
              </div>
              {(order.kecamatan || order.kota) && (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', paddingLeft: 23 }}>
                  {[order.kecamatan, order.kota].filter(Boolean).join(', ')}
                </div>
              )}
              {order.notes && (
                <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  "{order.notes}"
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Tanggal', value: fmt(order.created_at) },
                { label: 'Harga', value: rp(order.price || 75000) },
                {
                  label: 'Pembayaran',
                  value: order.payment_status === 'paid' ? 'Lunas' : order.payment_status === 'refunded' ? 'Dikembalikan' : 'Belum Dibayar',
                  color: order.payment_status === 'paid' ? 'var(--ok)' : order.payment_status === 'refunded' ? 'var(--ink-mute)' : 'var(--warn)',
                },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2, color: color || 'var(--ink)' }}>{value}</div>
                </div>
              ))}
            </div>

            {(order.agent_name || (user.role === 'agent' && order.user_name)) && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {order.agent_name && (
                  <div><span style={{ color: 'var(--ink-mute)' }}>Agent:</span> <strong style={{ color: 'var(--ink)' }}>{order.agent_name}</strong>{order.agent_phone ? ` · ${order.agent_phone}` : ''}</div>
                )}
                {user.role === 'agent' && order.user_name && (
                  <div><span style={{ color: 'var(--ink-mute)' }}>Klien:</span> <strong style={{ color: 'var(--ink)' }}>{order.user_name}</strong>{order.user_phone ? ` · ${order.user_phone}` : ''}</div>
                )}
              </div>
            )}

            {order.attachment_url && (() => {
              let urls;
              try { urls = JSON.parse(order.attachment_url); } catch { urls = [order.attachment_url]; }
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 8 }}>
                    Foto dari Klien ({urls.length})
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {urls.map((url, i) => (
                      <img
                        key={i}
                        src={getFileUrl(url)}
                        alt={`Lampiran ${i + 1}`}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--r-sm)', cursor: 'pointer', border: '1px solid var(--line)' }}
                        onClick={() => window.open(getFileUrl(url))}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Agent: Survey Submission Form */}
          {isAssignedAgent && order.status === 'assigned' && (
            <div className="mk-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                Kirim Hasil Survei
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 16 }}>
                Upload minimal 1 foto dan tulis catatan hasil survei kost.
              </div>

              {submitErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 16 }}>{submitErr}</div>}
              <form onSubmit={submitSurveyResult}>
                <div className="mk-field" style={{ marginBottom: 16 }}>
                  <label className="mk-label">
                    Foto Hasil Survei <span style={{ color: 'var(--err)' }}>*</span>
                    <span style={{ fontWeight: 400, color: 'var(--ink-mute)', marginLeft: 4 }}>(maks. 10 foto)</span>
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    className="mk-input"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoChange}
                    style={{ padding: '8px 12px' }}
                  />
                  {photoErr
                    ? <div className="mk-help" style={{ color: 'var(--err)' }}>{photoErr}</div>
                    : surveyPhotos.length > 0
                      ? <div className="mk-help" style={{ color: 'var(--ok)' }}>{surveyPhotos.length} foto dipilih</div>
                      : <div className="mk-help">Format: JPG, PNG, WebP · Maks. 10 foto · Maks. 5 MB/foto</div>
                  }
                  {previews.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {previews.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Preview ${i + 1}`}
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="mk-field" style={{ marginBottom: 16 }}>
                  <label className="mk-label">Catatan Hasil Survei <span style={{ color: 'var(--err)' }}>*</span></label>
                  <textarea
                    className="mk-input"
                    rows={4}
                    style={{ resize: 'vertical' }}
                    placeholder="Tulis kondisi kost, fasilitas, harga sewa, dan informasi penting lainnya..."
                    value={surveyNotes}
                    maxLength={CHAR_LIMIT}
                    onChange={(e) => setSurveyNotes(e.target.value)}
                  />
                  {surveyNotes.length >= CHAR_LIMIT && (
                    <div className="mk-help" style={{ color: 'var(--err)' }}>Maksimal {CHAR_LIMIT} karakter</div>
                  )}
                </div>

                <button className="mk-btn mk-btn-primary" type="submit" disabled={submitting}>
                  <Icon name="upload" size={15} />
                  {submitting ? 'Mengirim...' : 'Kirim Hasil Survei'}
                </button>
              </form>
            </div>
          )}

          {/* Survey Results */}
          {['result_submitted', 'completed'].includes(order.status) && surveyResult && (
            <div className="mk-card" style={{ padding: 24 }}>
              <div className="mk-row" style={{ gap: 8, marginBottom: 16 }}>
                <Icon name="check-circle" size={18} style={{ color: 'var(--ok)' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Hasil Survei</div>
              </div>

              {(surveyResult.photos || []).length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {surveyResult.photos.map((p) => (
                    <img
                      key={p.id}
                      src={getFileUrl(p.photo_url)}
                      alt="Foto survei"
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--r-sm)', cursor: 'pointer', border: '1px solid var(--line)' }}
                      onClick={() => window.open(getFileUrl(p.photo_url))}
                      title="Klik untuk lihat penuh"
                    />
                  ))}
                </div>
              )}

              <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {surveyResult.notes}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-mute)' }}>
                Survei oleh {order.agent_name} · {fmt(surveyResult.created_at)}
              </div>
            </div>
          )}

          {/* Finalize */}
          {isOwner && order.status === 'result_submitted' && (
            <div className="mk-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                Langkah Selanjutnya?
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 16 }}>
                Anda sudah melihat hasil survei. Pilih salah satu untuk menyelesaikan order ini.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="mk-btn mk-btn-ghost" disabled={finalizing} onClick={() => finalizeOrder('complete')}>
                  <Icon name="check" size={15} /> Selesaikan Order
                </button>
                <button className="mk-btn mk-btn-primary" disabled={finalizing} onClick={() => finalizeOrder('proceed_moving')}>
                  <Icon name="truck" size={15} /> Lanjut Pesan Pindahan
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 8 }}>
                "Lanjut Pesan Pindahan" akan membuka form pindahan dengan alamat kost sebagai tujuan.
              </div>
            </div>
          )}

          {/* Review & Complaint */}
          {isOwner && order.status === 'completed' && order.agent_id && (
            <>
              <ReviewForm orderId={order.id} orderType="survey" revieweeName={order.agent_name} />
              <ComplaintForm orderId={order.id} orderType="survey" />
            </>
          )}

          {/* Status Timeline */}
          <div className="mk-card" style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Riwayat Status</div>
            <StatusTimeline history={history} />
          </div>
        </div>

        {/* Right column: Chat */}
        <div className="mk-card" ref={chatRef} id="chat" style={{ padding: 20, position: 'sticky', top: 20 }}>
          <div className="mk-row" style={{ gap: 8, marginBottom: 16 }}>
            <Icon name="message" size={16} style={{ color: 'var(--ink-mute)' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Chat</div>
          </div>
          {chatPartnerId ? (
            <Chat orderId={id} toUserId={chatPartnerId} orderType="survey" />
          ) : (
            <div className="mk-empty" style={{ padding: '2rem 0' }}>
              <div className="mk-empty-icon"><Icon name="message" size={36} /></div>
              <div className="mk-empty-title" style={{ fontSize: 14 }}>
                {order.status === 'pending_payment'
                  ? 'Chat tersedia setelah pembayaran dan agent ditemukan.'
                  : order.status === 'finding_agent'
                    ? 'Chat tersedia setelah agent menerima order.'
                    : 'Chat tidak tersedia.'}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
