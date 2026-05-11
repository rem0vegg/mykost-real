import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const { type, orderId } = useParams();  // type: 'survey' | 'moving'
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');
  const [snapReady, setSnapReady] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const endpoint = type === 'survey'
          ? `/api/survey-orders/${orderId}`
          : `/api/moving-orders/${orderId}`;
        const { data } = await api.get(endpoint);
        setOrder(type === 'survey' ? data.order : data.order);
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
      const { data } = await api.post(endpoint);

      // Dev mode: Midtrans belum dikonfigurasi, order langsung dibayar di backend
      if (data.dev_mode) {
        const dest = type === 'survey'
          ? `/survey-orders/${orderId}`
          : `/moving-orders/${orderId}`;
        navigate(dest, { state: { paymentSuccess: true } });
        return;
      }

      if (!MIDTRANS_CLIENT_KEY || !snapReady) {
        // Fallback: redirect ke Midtrans hosted payment
        window.location.href = data.redirect_url;
        return;
      }

      window.snap.pay(data.snap_token, {
        onSuccess: () => {
          const dest = type === 'survey'
            ? `/survey-orders/${orderId}`
            : `/moving-orders/${orderId}`;
          navigate(dest, { state: { paymentSuccess: true } });
        },
        onPending: () => {
          const dest = type === 'survey'
            ? `/survey-orders/${orderId}`
            : `/moving-orders/${orderId}`;
          navigate(dest, { state: { paymentPending: true } });
        },
        onError: (result) => {
          setError('Pembayaran gagal. Silakan coba lagi.');
          console.error('[snap] error:', result);
        },
        onClose: () => {
          setPayLoading(false);
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memulai pembayaran');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) return <div className="mk-loading"><div className="mk-spinner" /></div>;
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
    <div className="mk-page" style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button
          className="mk-btn mk-btn-ghost mk-btn-sm"
          onClick={() => navigate(-1)}
          style={{ padding: '8px 10px' }}
        >
          <Icon name="arrow-left" size={16} />
        </button>
        <div>
          <div style={{ fontSize: 12, color: 'var(--ink-mute)', fontWeight: 500 }}>Pembayaran</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, margin: 0 }}>
            {isSurvey ? 'Checkout Survei Kost' : 'Checkout Pindahan'}
          </h1>
        </div>
      </div>

      {/* Status banner */}
      {isPaid && (
        <div className="mk-alert" style={{ background: 'var(--ok-soft)', border: '1px solid var(--ok)', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="check-circle" size={18} style={{ color: 'var(--ok)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ok)', fontSize: 14 }}>Sudah Dibayar</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Order ini sudah lunas dan sedang diproses.</div>
          </div>
        </div>
      )}

      {/* Order detail card */}
      <div className="mk-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>
          Detail Order
        </div>

        {isSurvey ? (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--brand-soft)', color: 'var(--brand)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon name="clipboard" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{order.kost_name}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{order.address}</div>
                {order.kota && <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>{[order.kecamatan, order.kota].filter(Boolean).join(', ')}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-soft)', padding: '8px 0', borderTop: '1px solid var(--line)' }}>
              <span>Layanan</span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Survei Kost</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{order.pickup_location}</span>
              </div>
              <div style={{ marginLeft: 3, width: 1, height: 10, background: 'var(--line-strong)' }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--brand)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{order.dropoff_location}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
              <div style={{ color: 'var(--ink-soft)' }}>Kendaraan</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{{ MOTORCYCLE: 'Motor', VAN: 'Van', PICKUP_BOX: 'Pickup Box' }[order.vehicle_type] || order.vehicle_type}</div>
              <div style={{ color: 'var(--ink-soft)' }}>Jarak</div>
              <div style={{ fontWeight: 600, textAlign: 'right' }}>{order.distance_km} km</div>
              {order.scheduled_date && (
                <>
                  <div style={{ color: 'var(--ink-soft)' }}>Tanggal</div>
                  <div style={{ fontWeight: 600, textAlign: 'right' }}>{new Date(order.scheduled_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Price breakdown */}
      <div className="mk-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>
          Rincian Harga
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isSurvey ? (
            <PriceLine label="Biaya survei" value={rp(price)} />
          ) : (
            <>
              <PriceLine label="Tarif dasar" value={rp(order.base_price)} />
              {parseInt(order.surcharge || 0) > 0 && <PriceLine label="Surcharge lantai" value={rp(order.surcharge)} />}
              {parseInt(order.addon_price || 0) > 0 && <PriceLine label="Add-on layanan" value={rp(order.addon_price)} />}
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid var(--line)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            <span style={{ fontSize: 15 }}>Total</span>
            <span style={{ fontSize: 18, color: 'var(--brand)' }}>{rp(price)}</span>
          </div>
        </div>
      </div>

      {/* Payment info */}
      <div className="mk-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
          Informasi Pembayaran
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <InfoLine icon="shield" text="Pembayaran aman diproses oleh Midtrans" />
          <InfoLine icon="wallet" text="Dana disimpan sebagai saldo digital jika order dibatalkan" />
          <InfoLine icon="credit-card" text="Tersedia: Transfer Bank, GoPay, OVO, DANA, QRIS, Kartu Kredit" />
          <InfoLine icon="refresh-cw" text="Refund otomatis ke saldo digital jika mover/surveyor tidak ditemukan" />
        </div>
      </div>

      {error && (
        <div className="mk-alert mk-alert-err" style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icon name="alert-circle" size={15} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {!isPaid && !isExpired && (
        <button
          className="mk-btn mk-btn-primary"
          style={{ width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 700, justifyContent: 'center' }}
          onClick={handlePay}
          disabled={payLoading}
        >
          {payLoading ? (
            <><div className="mk-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Memproses...</>
          ) : (
            <><Icon name="lock" size={16} /> Bayar {rp(price)} Sekarang</>
          )}
        </button>
      )}

      {(isPaid || isExpired) && (
        <button
          className="mk-btn mk-btn-ghost"
          style={{ width: '100%', padding: '14px 0', justifyContent: 'center' }}
          onClick={() => navigate(isSurvey ? `/survey-orders/${orderId}` : `/moving-orders/${orderId}`)}
        >
          Lihat Detail Order <Icon name="arrow-right" size={15} />
        </button>
      )}

      <p style={{ fontSize: 12, color: 'var(--ink-mute)', textAlign: 'center', marginTop: 14 }}>
        Dengan melanjutkan, Anda menyetujui Syarat & Ketentuan MyKost.
      </p>
    </div>
  );
}

function PriceLine({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--ink-soft)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}

function InfoLine({ icon, text }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'var(--ink-soft)' }}>
      <Icon name={icon} size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--brand)' }} />
      <span>{text}</span>
    </div>
  );
}
