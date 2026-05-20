import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Icon from '../components/Icon';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const MIDTRANS_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_SNAP_URL = import.meta.env.VITE_MIDTRANS_ENV === 'production'
  ? 'https://app.midtrans.com/snap/snap.js'
  : 'https://app.sandbox.midtrans.com/snap/snap.js';


function loadSnapScript(clientKey) {
  return new Promise((resolve, reject) => {
    if (document.getElementById('midtrans-snap')) return resolve();
    const script = document.createElement('script');
    script.id = 'midtrans-snap';
    script.src = MIDTRANS_SNAP_URL;
    script.setAttribute('data-client-key', clientKey);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { type, orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');
  const [snapReady, setSnapReady] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Verify payment dengan Midtrans API dan update status order
  const verifyAndRedirect = async () => {
    setVerifying(true);
    try {
      const { data } = await api.post(`/api/payments/${type}/${orderId}/verify`);
      if (data.status === 'paid' || data.already_paid) {
        navigate(type === 'survey' ? `/survey-orders/${orderId}` : `/moving-orders/${orderId}`,
          { state: { paymentSuccess: true } });
      }
    } catch {
      // Biarkan user lihat halaman checkout normal jika verify gagal
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const endpoint = type === 'survey'
          ? `/api/survey-orders/${orderId}`
          : `/api/moving-orders/${orderId}`;
        const { data } = await api.get(endpoint);
        setOrder(data.order);

        // Midtrans redirect balik dengan query params → auto-verify
        const txStatus = searchParams.get('transaction_status');
        if (txStatus && data.order.payment_status !== 'paid') {
          verifyAndRedirect();
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Order tidak ditemukan');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [type, orderId]);

  useEffect(() => {
    if (!MIDTRANS_CLIENT_KEY) return;
    loadSnapScript(MIDTRANS_CLIENT_KEY)
      .then(() => setSnapReady(true))
      .catch(() => setError('Gagal memuat payment gateway'));
  }, []);

  const handlePay = async () => {
    setPayLoading(true);
    setError('');
    try {
      const endpoint = type === 'survey'
        ? `/api/payments/survey/${orderId}/snap-token`
        : `/api/payments/moving/${orderId}/snap-token`;
      const { data } = await api.post(endpoint, {});

      if (data.dev_mode) {
        const dest = type === 'survey' ? `/survey-orders/${orderId}` : `/moving-orders/${orderId}`;
        navigate(dest, { state: { paymentSuccess: true } });
        return;
      }

      if (!MIDTRANS_CLIENT_KEY || !snapReady) {
        window.location.href = data.redirect_url;
        return;
      }

      window.snap.pay(data.snap_token, {
        onSuccess: () => verifyAndRedirect(),
        onPending: () => verifyAndRedirect(),
        onError: (result) => {
          setError('Pembayaran gagal. Silakan coba lagi.');
          console.error('[snap] error:', result);
          setPayLoading(false);
        },
        onClose: () => setPayLoading(false),
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memulai pembayaran');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading || verifying) return (
    <div className="mk-loading">
      <div className="mk-spinner" />
      {verifying && <p style={{ marginTop: 16, fontSize: 14, color: 'var(--ink-soft)' }}>Memverifikasi pembayaran...</p>}
    </div>
  );
  if (error && !order) return (
    <div className="mk-page" style={{ textAlign: 'center', paddingTop: 60 }}>
      <Icon name="alert-circle" size={48} style={{ color: 'var(--err)', marginBottom: 16 }} />
      <div style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 8 }}>{error}</div>
      <button className="mk-btn mk-btn-ghost" onClick={() => navigate('/dashboard')}>Kembali ke Dashboard</button>
    </div>
  );

  const isSurvey  = type === 'survey';
  const price     = isSurvey ? parseInt(order.price || 75000) : parseInt(order.estimated_price || 0);
  const isPaid    = order.payment_status === 'paid';
  const isExpired = isSurvey
    ? !['pending_payment'].includes(order.status)
    : !['PENDING_PAYMENT', 'REVIEW_REQUIRED'].includes(order.status);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)' }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--surface)', borderBottom: '1px solid var(--line)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button
          className="mk-btn mk-btn-ghost mk-btn-sm"
          onClick={() => navigate(-1)}
          style={{ padding: '8px 10px' }}
        >
          <Icon name="arrow-left" size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Pembayaran
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, letterSpacing: '-.01em' }}>
            {isSurvey ? 'Checkout Survei Kost' : 'Checkout Pindahan'}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: 'var(--ok)', fontWeight: 700,
          background: 'var(--ok-soft)', padding: '4px 10px', borderRadius: 'var(--r-pill)',
        }}>
          <Icon name="lock" size={11} />
          Aman
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 120px' }}>

        {/* Paid banner */}
        {isPaid && (
          <div style={{
            background: 'var(--ok-soft)', border: '1px solid var(--ok)',
            borderRadius: 'var(--r-md)', padding: '14px 18px',
            marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--ok)', color: '#fff',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <Icon name="check" size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--ok)', fontSize: 14 }}>Pembayaran Berhasil</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Order ini sudah lunas dan sedang diproses.</div>
            </div>
          </div>
        )}

        {/* Order Summary card */}
        <div className="mk-card" style={{ padding: 20, marginBottom: 12 }}>
          <SectionLabel icon="file-text" label="Ringkasan Order" />
          {isSurvey ? (
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--r-md)',
                background: 'var(--brand-soft)', color: 'var(--brand)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <Icon name="clipboard" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{order.kost_name}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 3 }}>{order.address}</div>
                {order.kota && (
                  <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>
                    {[order.kecamatan, order.kota].filter(Boolean).join(', ')}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600, color: 'var(--brand)',
                    background: 'var(--brand-soft)', padding: '3px 10px', borderRadius: 'var(--r-pill)',
                  }}>
                    <Icon name="search" size={12} /> Survei Kost
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0 }} className="mk-truncate">
                    {order.pickup_location}
                  </span>
                </div>
                <div style={{ marginLeft: 4, width: 2, height: 16, background: 'var(--line-strong)', borderRadius: 1 }} />
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--brand)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0 }} className="mk-truncate">
                    {order.dropoff_location}
                  </span>
                </div>
              </div>
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap',
                paddingTop: 12, borderTop: '1px solid var(--line)',
              }}>
                <MetaChip icon="truck" label={{ MOTORCYCLE: 'Motor', VAN: 'Van', PICKUP_BOX: 'Pickup Box' }[order.vehicle_type] || order.vehicle_type} />
                <MetaChip icon="navigation" label={`${order.distance_km} km`} />
                {order.scheduled_date && (
                  <MetaChip icon="calendar" label={new Date(order.scheduled_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} />
                )}
              </div>
            </>
          )}
        </div>

        {/* Price Breakdown */}
        <div className="mk-card" style={{ padding: 20, marginBottom: 12 }}>
          <SectionLabel icon="tag" label="Rincian Harga" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isSurvey ? (
              <PriceLine label="Biaya Survei Kost" value={rp(price)} />
            ) : (
              <>
                <PriceLine label="Tarif Dasar" value={rp(order.base_price)} />
                {parseInt(order.surcharge || 0) > 0 && (
                  <PriceLine label="Surcharge Lantai" value={rp(order.surcharge)} muted />
                )}
                {parseInt(order.addon_price || 0) > 0 && (
                  <PriceLine label="Add-on Layanan" value={rp(order.addon_price)} muted />
                )}
              </>
            )}
          </div>
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: '2px solid var(--line)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Total Pembayaran</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--brand)' }}>
              {rp(price)}
            </span>
          </div>
        </div>


        {/* Security info */}
        <div style={{
          padding: '14px 16px',
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--ink-soft)' }}>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <Icon name="shield" size={13} style={{ color: 'var(--ok)', flexShrink: 0 }} />
              <span>Pembayaran aman diproses oleh <strong>Midtrans</strong> — PCI DSS certified</span>
            </div>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <Icon name="refresh-cw" size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              <span>Refund otomatis ke saldo digital jika mover/surveyor tidak tersedia</span>
            </div>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <Icon name="wallet" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>Dana aman disimpan hingga layanan selesai</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mk-alert mk-alert-err" style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="alert-circle" size={15} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}
      </div>

      {/* Fixed bottom pay bar */}
      {!isPaid && !isExpired && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--surface)', borderTop: '1px solid var(--line)',
          padding: '14px 20px',
          boxShadow: '0 -4px 20px rgba(0,0,0,.08)',
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600 }}>Total</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--brand)' }}>
                  {rp(price)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                via Midtrans
              </div>
            </div>
            <button
              className="mk-btn mk-btn-primary"
              style={{ width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 700, justifyContent: 'center', borderRadius: 'var(--r-md)' }}
              onClick={handlePay}
              disabled={payLoading}
            >
              {payLoading ? (
                <><div className="mk-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Memproses...</>
              ) : (
                <><Icon name="lock" size={16} /> Bayar Sekarang</>
              )}
            </button>
            <p style={{ fontSize: 11, color: 'var(--ink-mute)', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
              Dengan melanjutkan, Anda menyetujui Syarat &amp; Ketentuan MyKost
            </p>
          </div>
        </div>
      )}

      {(isPaid || isExpired) && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--surface)', borderTop: '1px solid var(--line)',
          padding: '14px 20px',
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <button
              className="mk-btn mk-btn-ghost"
              style={{ width: '100%', padding: '14px 0', justifyContent: 'center' }}
              onClick={() => navigate(isSurvey ? `/survey-orders/${orderId}` : `/moving-orders/${orderId}`)}
            >
              Lihat Detail Order <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 'var(--r-sm)',
        background: 'var(--brand-soft)', color: 'var(--brand)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={14} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}
      </span>
    </div>
  );
}

function PriceLine({ label, value, muted }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: muted ? 'var(--ink-mute)' : 'var(--ink-soft)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: muted ? 'var(--ink-soft)' : 'var(--ink)' }}>{value}</span>
    </div>
  );
}

function MetaChip({ icon, label }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)',
      background: 'var(--surface-2)', padding: '4px 10px',
      borderRadius: 'var(--r-pill)',
    }}>
      <Icon name={icon} size={12} />
      {label}
    </div>
  );
}
