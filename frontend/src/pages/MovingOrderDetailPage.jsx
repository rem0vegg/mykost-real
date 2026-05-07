import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import StatusTimeline from '../components/StatusTimeline';
import Chat from '../components/Chat';
import ExpandableText, { maskPhone } from '../components/ExpandableText';
import ReviewForm from '../components/ReviewForm';
import ComplaintForm from '../components/ComplaintForm';
import Icon from '../components/Icon';

const VEHICLE_LABEL = { MOTORCYCLE: 'Motor', VAN: 'Van', PICKUP_BOX: 'Pickup Box' };

const MOVING_STATUS = {
  DRAFT:             { cls: 'mk-pill',              label: 'Draf' },
  SUBMITTED:         { cls: 'mk-pill mk-pill-info',  label: 'Terkirim' },
  PENDING_PAYMENT:   { cls: 'mk-pill mk-pill-warn',  label: 'Menunggu Pembayaran' },
  INSTANT_CONFIRMED: { cls: 'mk-pill mk-pill-info',  label: 'Menunggu Mover' },
  REVIEW_REQUIRED:   { cls: 'mk-pill mk-pill-warn',  label: 'Menunggu Review' },
  ACCEPTED:          { cls: 'mk-pill mk-pill-info',  label: 'Mover Ditugaskan' },
  ON_GOING:          { cls: 'mk-pill mk-pill-info',  label: 'Sedang Pindahan' },
  COMPLETED:         { cls: 'mk-pill mk-pill-ok',    label: 'Selesai' },
  INVALID:           { cls: 'mk-pill mk-pill-err',   label: 'Tidak Valid' },
  CANCELLED:         { cls: 'mk-pill mk-pill-err',   label: 'Dibatalkan' },
};

function StatusPill({ status }) {
  const cfg = MOVING_STATUS[status] || { cls: 'mk-pill mk-pill-info', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

function MapsLink({ lat, lng, label = 'Buka di Maps' }) {
  if (!lat || !lng) return null;
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank" rel="noopener noreferrer"
      className="mk-row"
      style={{ gap: 5, fontSize: 12, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex' }}
    >
      <Icon name="map-pin" size={13} /> {label}
    </a>
  );
}

const MISMATCH_REASONS = [
  { value: 'OVER_CAPACITY',       label: 'Barang melebihi kapasitas kendaraan' },
  { value: 'BARANG_TIDAK_SESUAI', label: 'Jenis barang tidak sesuai deskripsi' },
  { value: 'TIDAK_AMAN',          label: 'Kondisi barang / rute tidak aman' },
];

const VEHICLES = ['MOTORCYCLE', 'VAN', 'PICKUP_BOX'];

function OpTag({ children, variant }) {
  const colors = {
    warn: { background: 'var(--warn-soft, #fef3c7)', color: '#92400e' },
    ok:   { background: 'var(--ok-soft, #d1fae5)',   color: '#065f46' },
    base: { background: 'var(--surface-2)',           color: 'var(--ink-soft)' },
  };
  const s = colors[variant] || colors.base;
  return (
    <span style={{
      ...s,
      fontSize: 12, fontWeight: 600, padding: '3px 10px',
      borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

export default function MovingOrderDetailPage() {
  const { id }   = useParams();
  const { user, capabilities } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const chatRef  = useRef(null);

  const [order,   setOrder]   = useState(null);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showStatusForm, setShowStatusForm] = useState(false);
  const [statusForm,     setStatusForm]     = useState({ status: '', note: '' });
  const [updating,       setUpdating]       = useState(false);
  const [statusErr,      setStatusErr]      = useState('');

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm,     setReportForm]     = useState({ reason: '', notes: '' });
  const [reportPhoto,    setReportPhoto]    = useState(null);
  const [reporting,      setReporting]      = useState(false);
  const [reportErr,      setReportErr]      = useState('');
  const [reportResult,   setReportResult]   = useState(null);

  const [evidenceUploading, setEvidenceUploading] = useState({ pickup: false, delivery: false });

  const [showRebookForm, setShowRebookForm] = useState(false);
  const [rebookVehicle,  setRebookVehicle]  = useState('VAN');
  const [rebookDate,     setRebookDate]     = useState('');
  const [rebooking,      setRebooking]      = useState(false);
  const [rebookErr,      setRebookErr]      = useState('');

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

  useEffect(() => {
    if (location.hash === '#chat' && chatRef.current && order) {
      setTimeout(() => chatRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }, [location.hash, order]);

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

  if (loading) return <div className="mk-loading"><div className="mk-spinner" /></div>;
  if (!order)  return null;

  const hasMoverCap = (capabilities || []).some(c => c.capability === 'mover' && c.status === 'active');
  const isMover   = (user.role === 'mover' || hasMoverCap) && order.mover_id === user.id;
  const isUser    = !isMover && order.user_id === user.id;
  const canAccept = (user.role === 'mover' || hasMoverCap) && !order.mover_id && order.status === 'INSTANT_CONFIRMED' && order.payment_status === 'paid';
  const otherUser = isMover ? order.user_id : order.mover_id;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const rp  = (n) => n != null ? `Rp ${Number(n).toLocaleString('id-ID')}` : '—';

  const canUpdateStatus   = isMover && ['ACCEPTED', 'ON_GOING'].includes(order.status);
  const canReportMismatch = isMover && ['ACCEPTED', 'ON_GOING'].includes(order.status);
  const canRebook         = isUser  && order.status === 'INVALID';
  const canPay            = isUser  && order.status === 'PENDING_PAYMENT';
  const canCancel         = isUser  && !order.mover_id && ['PENDING_PAYMENT', 'INSTANT_CONFIRMED', 'REVIEW_REQUIRED', 'DRAFT'].includes(order.status);

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
    <div className="mk-page">
      <button className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: 20 }}>
        <Icon name="arrow-left" size={15} /> Kembali
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Order info card */}
          <div className="mk-card" style={{ padding: 24 }}>
            <div className="mk-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Detail Order Pindahan</div>
              <StatusPill status={order.status} />
            </div>

            {/* Info cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
              {[
                { label: 'Tanggal',    value: fmt(order.scheduled_date) },
                { label: 'Kendaraan', value: VEHICLE_LABEL[order.vehicle_type] || order.vehicle_type },
                { label: 'Jarak',     value: `${order.distance_km} km` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Route */}
            <div style={{ marginBottom: 16 }}>
              {/* Pickup */}
              <div style={{ marginBottom: 12 }}>
                <div className="mk-row" style={{ gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 'var(--r-pill)', background: 'var(--brand)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Lokasi Pickup</span>
                </div>
                <div style={{ paddingLeft: 14, fontSize: 14, wordBreak: 'break-word' }}>
                  {isMover || (isUser && order.mover_id) ? (
                    <>
                      <div>{order.pickup_location}</div>
                      <MapsLink lat={order.pickup_latitude} lng={order.pickup_longitude} />
                    </>
                  ) : (
                    <ExpandableText text={order.pickup_location} limit={70} />
                  )}
                </div>
              </div>

              <div style={{ marginLeft: 3, width: 2, height: 16, background: 'var(--line-strong)', marginBottom: 12 }} />

              {/* Dropoff */}
              <div>
                <div className="mk-row" style={{ gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 'var(--r-pill)', border: '2px solid var(--brand)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Lokasi Tujuan</span>
                </div>
                <div style={{ paddingLeft: 14, fontSize: 14, wordBreak: 'break-word' }}>
                  {isMover || (isUser && order.mover_id) ? (
                    <>
                      <div>{order.dropoff_location}</div>
                      <MapsLink lat={order.dropoff_latitude} lng={order.dropoff_longitude} />
                    </>
                  ) : (
                    <ExpandableText text={order.dropoff_location} limit={70} />
                  )}
                </div>
              </div>
            </div>

            {/* Operational detail */}
            <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
                Detail Operasional
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13, marginBottom: 10 }}>
                <div>Lantai Pickup: <strong>Lt. {order.pickup_floor}</strong></div>
                <div>Lantai Tujuan: <strong>Lt. {order.dropoff_floor}</strong></div>
                <div>Lift: <strong>{order.has_lift ? 'Ada' : 'Tidak Ada'}</strong></div>
                {order.estimated_item_count != null && (
                  <div>Est. Barang: <strong>{order.estimated_item_count} item</strong></div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {order.is_round_trip     && <OpTag>Pulang Pergi</OpTag>}
                {order.is_door_to_door   && <OpTag>Door-to-Door</OpTag>}
                {order.has_large_items   && <OpTag>Barang Besar</OpTag>}
                {order.has_fragile       && <OpTag variant="warn">Fragile</OpTag>}
                {order.needs_disassembly && <OpTag>Bongkar Pasang</OpTag>}
                {order.has_parking       && <OpTag variant="ok">Parkir Tersedia</OpTag>}
                {order.narrow_alley      && <OpTag variant="warn">Gang Sempit</OpTag>}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                  Catatan
                </div>
                <div style={{ fontSize: 13 }}>
                  <ExpandableText text={order.notes} limit={150} />
                </div>
              </div>
            )}

            {/* Contact */}
            <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                Kontak
              </div>
              {isUser && order.mover_id && (
                <div style={{ fontSize: 13 }}>
                  <strong>Mover:</strong> {order.mover_name}
                  {order.mover_phone && (
                    <> · <a href={`tel:${order.mover_phone}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>{order.mover_phone}</a></>
                  )}
                </div>
              )}
              {isUser && !order.mover_id && (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Belum ada mover. Kontak akan muncul setelah mover menerima order.</div>
              )}
              {user.role === 'mover' && (
                <div style={{ fontSize: 13 }}>
                  <strong>Pemesan:</strong> {order.user_name}
                  {order.user_phone && (
                    isMover
                      ? <> · <a href={`tel:${order.user_phone}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>{order.user_phone}</a></>
                      : <> · <span style={{ color: 'var(--ink-mute)' }}>{maskPhone(order.user_phone)} <span style={{ fontSize: 12 }}>(terbuka setelah accept)</span></span></>
                  )}
                </div>
              )}
            </div>

            {/* Pricing */}
            <div style={{ paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
                Rincian Harga
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                <div className="mk-row" style={{ justifyContent: 'space-between' }}>
                  <span>Tarif dasar</span><strong>{rp(order.base_price)}</strong>
                </div>
                {order.surcharge > 0 && (
                  <div className="mk-row" style={{ justifyContent: 'space-between' }}>
                    <span>Surcharge</span><strong>{rp(order.surcharge)}</strong>
                  </div>
                )}
                {order.addon_price > 0 && (
                  <div className="mk-row" style={{ justifyContent: 'space-between' }}>
                    <span>Add-on</span><strong>{rp(order.addon_price)}</strong>
                  </div>
                )}
                {order.is_round_trip && (
                  <div className="mk-row" style={{ justifyContent: 'space-between' }}>
                    <span>Pulang pergi (+50%)</span><strong>termasuk</strong>
                  </div>
                )}
                <div className="mk-row" style={{ justifyContent: 'space-between', marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--brand)' }}>
                    {rp(order.estimated_price)}
                    {order.payment_status === 'paid' && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ok)', fontWeight: 700, fontFamily: 'var(--font-body)' }}>LUNAS</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Item photos */}
            {order.photo_urls?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 8 }}>
                  Foto Barang (dari user)
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {order.photo_urls.map((url, i) => (
                    <a key={i} href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer">
                      <img src={`http://localhost:5000${url}`} alt="barang"
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Pickup & Delivery evidence */}
            {['ACCEPTED', 'ON_GOING', 'COMPLETED'].includes(order.status) && (
              <>
                {(isMover || (order.pickup_photo_urls?.length > 0)) && (
                  <div style={{ marginTop: 16 }}>
                    <div className="mk-row" style={{ gap: 6, marginBottom: 8 }}>
                      <Icon name="package" size={14} style={{ color: 'var(--ink-soft)' }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Bukti Pickup</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      {(order.pickup_photo_urls || []).map((url, i) => (
                        <a key={i} href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer">
                          <img src={`http://localhost:5000${url}`} alt="pickup"
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }} />
                        </a>
                      ))}
                      {isMover && (order.pickup_photo_urls?.length || 0) === 0 && (
                        <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Belum ada foto bukti pickup.</div>
                      )}
                    </div>
                    {isMover && order.status !== 'COMPLETED' && (
                      <label className="mk-btn mk-btn-ghost mk-btn-sm" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                        <Icon name="camera" size={14} />
                        {evidenceUploading.pickup ? 'Mengunggah...' : 'Upload Foto Pickup'}
                        <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                          onChange={(e) => uploadEvidence(e, 'pickup')} disabled={evidenceUploading.pickup} />
                      </label>
                    )}
                  </div>
                )}

                {(isMover || (order.delivery_photo_urls?.length > 0)) && (
                  <div style={{ marginTop: 16 }}>
                    <div className="mk-row" style={{ gap: 6, marginBottom: 8 }}>
                      <Icon name="check-circle" size={14} style={{ color: 'var(--ink-soft)' }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>Bukti Delivery</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      {(order.delivery_photo_urls || []).map((url, i) => (
                        <a key={i} href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer">
                          <img src={`http://localhost:5000${url}`} alt="delivery"
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }} />
                        </a>
                      ))}
                      {isMover && (order.delivery_photo_urls?.length || 0) === 0 && (
                        <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Belum ada foto bukti delivery.</div>
                      )}
                    </div>
                    {isMover && order.status !== 'COMPLETED' && (
                      <label className="mk-btn mk-btn-ghost mk-btn-sm" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                        <Icon name="camera" size={14} />
                        {evidenceUploading.delivery ? 'Mengunggah...' : 'Upload Foto Delivery'}
                        <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                          onChange={(e) => uploadEvidence(e, 'delivery')} disabled={evidenceUploading.delivery} />
                      </label>
                    )}
                  </div>
                )}
              </>
            )}

            {/* INVALID info */}
            {order.status === 'INVALID' && (
              <div className="mk-alert mk-alert-err" style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Order Dibatalkan (Mismatch)</div>
                <div style={{ fontSize: 13 }}>Alasan: <strong>{order.invalid_reason}</strong></div>
              </div>
            )}

            {/* Payment confirmed notice */}
            {isUser && order.payment_status === 'paid' && !order.mover_id && (
              <div className="mk-alert mk-alert-ok" style={{ marginTop: 14 }}>
                <Icon name="check-circle" size={15} style={{ marginRight: 6 }} />
                Pembayaran terkonfirmasi — menunggu mover mengambil order ini.
              </div>
            )}

            {/* Action buttons */}
            {(canPay || canCancel || canAccept) && (
              <div className="mk-row" style={{ gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                {canPay && (
                  <button className="mk-btn mk-btn-primary" onClick={payOrder}>
                    <Icon name="wallet" size={15} />
                    Bayar Sekarang — {rp(order.estimated_price)}
                  </button>
                )}
                {canCancel && (
                  <button
                    className="mk-btn mk-btn-ghost"
                    onClick={cancelOrder}
                    style={{ color: 'var(--err)', borderColor: 'var(--err)' }}
                  >
                    Batalkan Order
                  </button>
                )}
                {canAccept && (
                  <button className="mk-btn mk-btn-primary" onClick={acceptJob}>
                    <Icon name="check" size={15} /> Ambil Job Ini
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mover: Update Status */}
          {canUpdateStatus && (
            <div className="mk-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Update Status</div>

              {order.status === 'ON_GOING' && (() => {
                const hasPickup   = (order.pickup_photo_urls   || []).length > 0;
                const hasDelivery = (order.delivery_photo_urls || []).length > 0;
                if (hasPickup && hasDelivery) return null;
                const missing = [!hasPickup && 'pickup', !hasDelivery && 'delivery'].filter(Boolean).join(' & ');
                return (
                  <div className="mk-alert mk-alert-warn" style={{ marginBottom: 14 }}>
                    <Icon name="alert-circle" size={14} style={{ marginRight: 6 }} />
                    Upload bukti foto <strong>{missing}</strong> dulu di section bukti di atas sebelum bisa menyelesaikan order.
                  </div>
                );
              })()}

              {!showStatusForm ? (
                <button className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => setShowStatusForm(true)}>
                  <Icon name="refresh" size={14} /> Update Status
                </button>
              ) : (
                <form onSubmit={updateStatus}>
                  {statusErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 12 }}>{statusErr}</div>}
                  <div className="mk-field" style={{ marginBottom: 14 }}>
                    <label className="mk-label">Status Baru</label>
                    <select
                      className="mk-input"
                      value={statusForm.status}
                      onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                      required
                    >
                      <option value="">Pilih status...</option>
                      {order.status === 'ACCEPTED' && (
                        <option value="ON_GOING">Mulai angkut (ON_GOING)</option>
                      )}
                      {order.status === 'ON_GOING' && (() => {
                        const hasPickup   = (order.pickup_photo_urls   || []).length > 0;
                        const hasDelivery = (order.delivery_photo_urls || []).length > 0;
                        const ready = hasPickup && hasDelivery;
                        return (
                          <option value="COMPLETED" disabled={!ready}>
                            {ready ? 'Selesaikan order (COMPLETED)' : 'Selesaikan order — upload bukti dulu'}
                          </option>
                        );
                      })()}
                    </select>
                  </div>
                  {statusForm.status === 'COMPLETED' && (
                    <div className="mk-alert mk-alert-ok" style={{ marginBottom: 14 }}>
                      User sudah membayar <strong>{rp(order.estimated_price)}</strong> di awal — tidak perlu input harga.
                    </div>
                  )}
                  <div className="mk-field" style={{ marginBottom: 14 }}>
                    <label className="mk-label">Catatan (opsional)</label>
                    <textarea
                      className="mk-input"
                      rows={2}
                      value={statusForm.note}
                      onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                    />
                  </div>
                  <div className="mk-row" style={{ gap: 10 }}>
                    <button className="mk-btn mk-btn-primary mk-btn-sm" type="submit" disabled={updating}>
                      {updating ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button className="mk-btn mk-btn-ghost mk-btn-sm" type="button" onClick={() => setShowStatusForm(false)}>Batal</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Mover: Report Mismatch */}
          {canReportMismatch && (
            <div className="mk-card" style={{ padding: 24, borderLeft: '3px solid var(--err)' }}>
              <div className="mk-row" style={{ gap: 8, marginBottom: 14 }}>
                <Icon name="alert-circle" size={16} style={{ color: 'var(--err)' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--err)' }}>Laporkan Mismatch</div>
              </div>

              {reportResult && (
                <div className="mk-alert mk-alert-ok" style={{ marginBottom: 14 }}>
                  <strong>Laporan terkirim.</strong>
                  {reportResult.recommended_vehicle && ` Kendaraan yang disarankan: ${reportResult.recommended_vehicle}`}
                </div>
              )}

              {!showReportForm ? (
                <button
                  className="mk-btn mk-btn-ghost mk-btn-sm"
                  style={{ color: 'var(--err)', borderColor: 'var(--err)' }}
                  onClick={() => setShowReportForm(true)}
                >
                  Laporkan Kondisi Tidak Sesuai
                </button>
              ) : (
                <form onSubmit={reportMismatch}>
                  {reportErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 12 }}>{reportErr}</div>}
                  <div className="mk-field" style={{ marginBottom: 14 }}>
                    <label className="mk-label">Alasan <span style={{ color: 'var(--err)' }}>*</span></label>
                    <select
                      className="mk-input"
                      value={reportForm.reason}
                      onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                      required
                    >
                      <option value="">Pilih alasan...</option>
                      {MISMATCH_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mk-field" style={{ marginBottom: 14 }}>
                    <label className="mk-label">Foto Bukti <span style={{ color: 'var(--err)' }}>*</span></label>
                    <input
                      type="file"
                      className="mk-input"
                      accept="image/*"
                      onChange={(e) => setReportPhoto(e.target.files[0])}
                      required
                      style={{ padding: '8px 12px' }}
                    />
                  </div>
                  <div className="mk-field" style={{ marginBottom: 14 }}>
                    <label className="mk-label">Keterangan tambahan (opsional)</label>
                    <textarea
                      className="mk-input"
                      rows={2}
                      value={reportForm.notes}
                      onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
                    />
                  </div>
                  <div className="mk-row" style={{ gap: 10 }}>
                    <button
                      className="mk-btn mk-btn-sm"
                      type="submit"
                      disabled={reporting}
                      style={{ background: 'var(--err)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)' }}
                    >
                      {reporting ? 'Mengirim...' : 'Kirim Laporan'}
                    </button>
                    <button className="mk-btn mk-btn-ghost mk-btn-sm" type="button" onClick={() => setShowReportForm(false)}>Batal</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Driver reports history */}
          {reports.length > 0 && (
            <div className="mk-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Laporan Driver</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reports.map((r) => (
                  <div key={r.id} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', fontSize: 13 }}>
                    <div style={{ marginBottom: 2 }}><strong>Alasan:</strong> {r.reason}</div>
                    {r.notes && <div style={{ marginBottom: 2 }}><strong>Catatan:</strong> {r.notes}</div>}
                    <div style={{ color: 'var(--ink-mute)' }}>{new Date(r.created_at).toLocaleString('id-ID')}</div>
                    {r.photo_url && (
                      <img
                        src={`http://localhost:5000${r.photo_url}`}
                        alt="bukti"
                        style={{ marginTop: 8, width: 120, height: 80, objectFit: 'cover', borderRadius: 'var(--r-xs)', border: '1px solid var(--line)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User: Rebook */}
          {canRebook && (
            <div className="mk-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Pesan Ulang (Rebook)</div>
              <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 14 }}>
                Order dibatalkan karena mismatch. Pilih kendaraan yang sesuai dan pesan ulang.
              </div>
              {rebookErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 12 }}>{rebookErr}</div>}
              {!showRebookForm ? (
                <button className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => setShowRebookForm(true)}>
                  <Icon name="refresh" size={14} /> Rebook Sekarang
                </button>
              ) : (
                <form onSubmit={rebookOrder}>
                  <div className="mk-field" style={{ marginBottom: 14 }}>
                    <label className="mk-label">Pilih Kendaraan <span style={{ color: 'var(--err)' }}>*</span></label>
                    <select
                      className="mk-input"
                      value={rebookVehicle}
                      onChange={(e) => setRebookVehicle(e.target.value)}
                      required
                    >
                      {VEHICLES.map((v) => (
                        <option key={v} value={v}>{VEHICLE_LABEL[v] || v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mk-field" style={{ marginBottom: 14 }}>
                    <label className="mk-label">Tanggal Baru (opsional)</label>
                    <input className="mk-input" type="date" value={rebookDate} onChange={(e) => setRebookDate(e.target.value)} />
                  </div>
                  <div className="mk-row" style={{ gap: 10 }}>
                    <button className="mk-btn mk-btn-primary mk-btn-sm" type="submit" disabled={rebooking}>
                      {rebooking ? 'Memproses...' : 'Buat Order Baru'}
                      <Icon name="arrow-right" size={14} />
                    </button>
                    <button className="mk-btn mk-btn-ghost mk-btn-sm" type="button" onClick={() => setShowRebookForm(false)}>Batal</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Review & Complaint */}
          {isUser && order.status === 'COMPLETED' && order.mover_id && (
            <>
              <ReviewForm orderId={order.id} orderType="moving" revieweeName={order.mover_name} />
              <ComplaintForm orderId={order.id} orderType="moving" />
            </>
          )}

          {/* Status History */}
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
          {otherUser ? (
            <Chat orderId={id} toUserId={otherUser} orderType="moving" />
          ) : (
            <div className="mk-empty" style={{ padding: '2rem 0' }}>
              <div className="mk-empty-icon"><Icon name="message" size={36} /></div>
              <div className="mk-empty-title" style={{ fontSize: 14 }}>Chat tersedia setelah mover menerima order ini.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
