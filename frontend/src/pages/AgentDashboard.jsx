import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import Icon from '../components/Icon';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

function StatusPill({ status }) {
  const MAP = {
    pending_payment: { cls: 'mk-pill mk-pill-warn', label: 'Menunggu pembayaran' },
    finding_agent:   { cls: 'mk-pill mk-pill-info', label: 'Mencari surveyor' },
    assigned:        { cls: 'mk-pill mk-pill-info', label: 'Sedang disurvei' },
    completed:       { cls: 'mk-pill mk-pill-ok',   label: 'Selesai' },
    cancelled:       { cls: 'mk-pill',              label: 'Dibatalkan' },
  };
  const cfg = MAP[status] || { cls: 'mk-pill mk-pill-info', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

function JobCard({ order, onAccept, accepting, onView, isMyOrder }) {
  return (
    <article className="mk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mk-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mk-row" style={{ gap: 6, color: 'var(--ink-mute)', fontSize: 12, marginBottom: 5 }}>
            <Icon name="map-pin" size={13} />
            {[order.kecamatan, order.kota].filter(Boolean).join(', ')}
          </div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
            margin: 0, letterSpacing: '-.01em', lineHeight: 1.3,
          }}>
            {order.kost_name}
          </h3>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
            Klien: <strong style={{ color: 'var(--ink)' }}>{order.user_name}</strong>
            {order.user_phone && <span style={{ color: 'var(--ink-mute)' }}> · {order.user_phone}</span>}
          </div>
          {order.notes && (
            <div style={{
              marginTop: 8, padding: '8px 11px',
              background: 'var(--surface-2)', borderRadius: 'var(--r-sm)',
              fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45, fontStyle: 'italic',
              wordBreak: 'break-word', overflowWrap: 'anywhere',
            }}>
              "{order.notes}"
            </div>
          )}
          {isMyOrder && order.status === 'assigned' && (
            <div className="mk-row" style={{ gap: 6, marginTop: 8, fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
              <Icon name="camera" size={13} />
              Perlu kirim hasil survei
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <StatusPill status={order.status} />
          {!isMyOrder && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Komisi</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand)' }}>
                {rp(60000)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mk-row" style={{ gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <button className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => {
          if (!isMyOrder) { alert('Terima order terlebih dahulu untuk mengakses detail.'); return; }
          onView(order.id);
        }}>
          Detail
        </button>
        {isMyOrder ? (
          <button className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => onView(order.id)}>
            {order.status === 'assigned' ? (
              <><Icon name="upload" size={14} /> Kirim Hasil</>
            ) : 'Lihat Detail'}
          </button>
        ) : (
          <button
            className="mk-btn mk-btn-primary mk-btn-sm"
            onClick={() => onAccept(order.id)}
            disabled={accepting === order.id}
          >
            <Icon name="check" size={14} />
            {accepting === order.id ? 'Menerima...' : 'Terima'}
          </button>
        )}
      </div>
    </article>
  );
}

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const _urlTab = searchParams.get('tab');
  const tab = _urlTab === 'my' ? 'my-orders' : _urlTab === 'earn' ? 'commissions' : 'available';
  const setTab = (t) => {
    if (t === 'available') setSearchParams({}, { replace: true });
    else if (t === 'my-orders') setSearchParams({ tab: 'my' }, { replace: true });
    else if (t === 'commissions') setSearchParams({ tab: 'earn' }, { replace: true });
  };
  const [available, setAvailable] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [noKota, setNoKota] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  const fetchData = async () => {
    try {
      const [a, m, c] = await Promise.all([
        api.get('/api/survey-orders/available'),
        api.get('/api/survey-orders/my-orders'),
        api.get('/api/survey-orders/agent/commissions').catch(() => ({ data: { list: [] } })),
      ]);
      setAvailable(a.data.orders);
      setNoKota(a.data.noKota || false);
      setMyOrders(m.data.orders);
      setCommissions(c.data.list || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const acceptOrder = async (orderId) => {
    setAccepting(orderId);
    try {
      await api.post(`/api/survey-orders/${orderId}/accept`);
      await fetchData();
      setTab('my-orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menerima order');
    } finally {
      setAccepting(null);
    }
  };

  const activeCount  = myOrders.filter((o) => o.status === 'assigned').length;
  const doneCount    = myOrders.filter((o) => o.status === 'completed').length;
  const totalComm    = commissions.reduce((s, c) => s + (c.amount || 0), 0);

  if (loading) return <div className="mk-loading"><div className="mk-spinner" /></div>;

  return (
    <div className="mk-page">
      {/* Header */}
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink-mute)', fontWeight: 500 }}>
          Surveyor{user?.kota ? ` · ${user.kota}` : ''}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-.02em' }}>
          Hi, {user?.name?.split(' ')[0] || 'Surveyor'}
        </h1>
      </div>

      {/* Kota warning */}
      {noKota && (
        <div className="mk-alert mk-alert-warn" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="alert-circle" size={16} />
          <span>
            Kota belum diatur.{' '}
            <Link to="/profile" style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>
              Set kota di Profil
            </Link>{' '}
            agar bisa melihat dan menerima order survei.
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="mk-stat">
          <div className="mk-stat-label">Tersedia</div>
          <div className="mk-stat-value">{available.length}</div>
          <div className="mk-stat-sub">di {user?.kota || 'kotamu'}</div>
        </div>
        <div className="mk-stat">
          <div className="mk-stat-label">Aktif</div>
          <div className="mk-stat-value">{activeCount}</div>
          <div className="mk-stat-sub">perlu hasil survei</div>
        </div>
        <div className="mk-stat">
          <div className="mk-stat-label">Komisi bulan ini</div>
          <div className="mk-stat-value" style={{ color: 'var(--brand)' }}>{rp(totalComm)}</div>
          <div className="mk-stat-sub">{doneCount} selesai</div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="mk-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="mk-tabs">
            {[
              { id: 'available', label: `Tersedia (${available.length})` },
              { id: 'my-orders', label: `Pekerjaan Saya (${myOrders.length})` },
              { id: 'commissions', label: 'Komisi' },
            ].map((t) => (
              <button
                key={t.id}
                className={`mk-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'available' && (
            <button className="mk-btn mk-btn-ghost mk-btn-sm">
              <Icon name="filter" size={14} /> Filter
            </button>
          )}
        </div>

        {/* Available orders */}
        {tab === 'available' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!noKota && user?.kota && (
              <p style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                Menampilkan order di area: <strong style={{ color: 'var(--ink)' }}>{user.kota}</strong>
              </p>
            )}
            {available.length === 0 && !noKota ? (
              <div className="mk-empty">
                <div className="mk-empty-icon"><Icon name="search" size={44} /></div>
                <div className="mk-empty-title">Tidak ada order tersedia</div>
                <div className="mk-empty-sub">Cek kembali nanti atau update kota di profil Anda.</div>
              </div>
            ) : (
              available.map((order) => (
                <JobCard
                  key={order.id}
                  order={order}
                  onAccept={acceptOrder}
                  accepting={accepting}
                  onView={(id) => navigate(`/survey-orders/${id}`)}
                  isMyOrder={false}
                />
              ))
            )}
          </div>
        )}

        {/* My orders */}
        {tab === 'my-orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myOrders.length === 0 ? (
              <div className="mk-empty">
                <div className="mk-empty-icon"><Icon name="clipboard" size={44} /></div>
                <div className="mk-empty-title">Belum ada pekerjaan</div>
                <div className="mk-empty-sub">Terima order dari tab "Tersedia" untuk mulai.</div>
              </div>
            ) : (
              myOrders.map((order) => (
                <JobCard
                  key={order.id}
                  order={order}
                  onAccept={acceptOrder}
                  accepting={accepting}
                  onView={(id) => navigate(`/survey-orders/${id}`)}
                  isMyOrder
                />
              ))
            )}
          </div>
        )}

        {/* Commissions */}
        {tab === 'commissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Earnings summary card */}
            <div className="mk-card" style={{
              padding: 20, background: 'var(--brand)', border: 'none', color: '#fff',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: .85, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                Total Estimasi Komisi
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-.02em' }}>
                {rp(totalComm)}
              </div>
            </div>

            {commissions.length === 0 ? (
              <div className="mk-empty">
                <div className="mk-empty-icon"><Icon name="wallet" size={44} /></div>
                <div className="mk-empty-title">Belum ada data komisi</div>
              </div>
            ) : (
              commissions.map((comm) => (
                <div key={comm.id} className="mk-card" style={{
                  padding: '14px 18px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Order #{String(comm.orderId || '').slice(0, 8)}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>
                      {comm.date ? new Date(comm.date).toLocaleDateString('id-ID') : '—'}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      Status:{' '}
                      <strong style={{ color: comm.status === 'Paid' ? 'var(--ok)' : 'var(--warn)' }}>
                        {comm.status}
                      </strong>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand)' }}>
                    +{rp(comm.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
