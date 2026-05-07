import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Icon from '../components/Icon';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const fmtMonth = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID') : '—';

const STATUS_LABEL = {
  DRAFT:             { cls: 'mk-pill',              label: 'Draft' },
  SUBMITTED:         { cls: 'mk-pill mk-pill-warn',  label: 'Menunggu konfirmasi' },
  INSTANT_CONFIRMED: { cls: 'mk-pill mk-pill-info',  label: 'Menunggu mover' },
  REVIEW_REQUIRED:   { cls: 'mk-pill mk-pill-warn',  label: 'Perlu review' },
  ACCEPTED:          { cls: 'mk-pill mk-pill-info',  label: 'Mover ditugaskan' },
  ON_GOING:          { cls: 'mk-pill mk-pill-info',  label: 'Sedang pindahan' },
  COMPLETED:         { cls: 'mk-pill mk-pill-ok',    label: 'Selesai' },
  INVALID:           { cls: 'mk-pill mk-pill-err',   label: 'Dibatalkan' },
  CANCELLED:         { cls: 'mk-pill',              label: 'Dibatalkan' },
};

function StatusPill({ status }) {
  const cfg = STATUS_LABEL[status] || { cls: 'mk-pill mk-pill-info', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

function JobCard({ order, onAccept, accepting, isMyJob }) {
  const navigate = useNavigate();
  return (
    <article className="mk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mk-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Route */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="mk-row" style={{ gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 'var(--r-pill)', background: 'var(--brand)', flexShrink: 0 }} />
              <span className="mk-truncate" style={{ fontSize: 14, fontWeight: 600 }}>{order.pickup_location}</span>
            </div>
            <div style={{ marginLeft: 3, width: 1, height: 14, background: 'var(--line-strong)' }} />
            <div className="mk-row" style={{ gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 'var(--r-pill)', border: '2px solid var(--brand)', flexShrink: 0 }} />
              <span className="mk-truncate" style={{ fontSize: 14, fontWeight: 600 }}>{order.dropoff_location}</span>
            </div>
          </div>
          {/* Meta */}
          <div className="mk-row" style={{ gap: 6, marginTop: 8, fontSize: 12, color: 'var(--ink-mute)', flexWrap: 'wrap' }}>
            <Icon name="truck" size={13} />
            <span>{order.vehicle_type}</span>
            <span>·</span>
            <span>{order.distance_km} km</span>
            {order.scheduled_date && <><span>·</span><span>{fmt(order.scheduled_date)}</span></>}
          </div>
          {order.has_large_items && (
            <div className="mk-row" style={{ gap: 5, marginTop: 5, fontSize: 12, color: 'var(--warn)', fontWeight: 600 }}>
              <Icon name="alert-circle" size={13} />
              Barang besar
            </div>
          )}
          {!isMyJob && (
            <div style={{ marginTop: 5, fontSize: 12, color: 'var(--ink-soft)' }}>
              Pemesan: <strong>{order.user_name}</strong>
              {order.user_phone && <span style={{ color: 'var(--ink-mute)' }}> · {order.user_phone}</span>}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <StatusPill status={order.status} />
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
              {isMyJob && order.final_price ? 'Final' : 'Estimasi'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand)' }}>
              {rp(isMyJob && order.final_price ? order.final_price : order.estimated_price)}
            </div>
          </div>
        </div>
      </div>

      <div className="mk-row" style={{ gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <button className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => {
          if (!isMyJob) { alert('Ambil job terlebih dahulu untuk mengakses detail.'); return; }
          navigate(`/moving-orders/${order.id}`);
        }}>
          Detail
        </button>
        {isMyJob ? (
          <button className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => navigate(`/moving-orders/${order.id}`)}>
            Kelola Job
          </button>
        ) : (
          <button
            className="mk-btn mk-btn-primary mk-btn-sm"
            onClick={() => onAccept(order.id)}
            disabled={accepting === order.id}
          >
            <Icon name="check" size={14} />
            {accepting === order.id ? 'Memproses...' : 'Ambil Job'}
          </button>
        )}
      </div>
    </article>
  );
}

export default function MoverDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const _urlTab = searchParams.get('tab');
  const tab = _urlTab === 'my' ? 'my-jobs' : _urlTab === 'earn' ? 'earnings' : 'available';
  const setTab = (t) => {
    if (t === 'available') setSearchParams({}, { replace: true });
    else if (t === 'my-jobs') setSearchParams({ tab: 'my' }, { replace: true });
    else if (t === 'earnings') setSearchParams({ tab: 'earn' }, { replace: true });
  };
  const [available, setAvailable] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  const fetchData = async () => {
    try {
      const [a, m, e] = await Promise.all([
        api.get('/api/moving-orders/available'),
        api.get('/api/moving-orders/my-jobs'),
        api.get('/api/moving-orders/earnings'),
      ]);
      setAvailable(a.data.orders);
      setMyJobs(m.data.orders);
      setEarnings(e.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const acceptOrder = async (id) => {
    setAccepting(id);
    try {
      await api.post(`/api/moving-orders/${id}/accept`);
      await fetchData();
      setTab('my-jobs');
    } catch {}
    setAccepting(null);
  };

  const summary = earnings?.summary || {};

  if (loading) return <div className="mk-loading"><div className="mk-spinner" /></div>;

  return (
    <div className="mk-page">
      {/* Header */}
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink-mute)', fontWeight: 500 }}>Mover · JaBoDeTaBek</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-.02em' }}>
          Dashboard Mover
        </h1>
      </div>

      {/* Earnings hero card */}
      <div className="mk-card" style={{
        padding: 20, background: 'var(--brand)', border: 'none', color: '#fff',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: .85, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Penghasilan bulan ini
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-.02em' }}>
          {rp(summary.this_month)}
        </div>
        <div className="mk-row" style={{ gap: 16, fontSize: 12, opacity: .9 }}>
          <span className="mk-row" style={{ gap: 4 }}>
            <Icon name="trending-up" size={14} />
            {summary.completed_count || 0} job selesai
          </span>
          <span>·</span>
          <span>{rp(summary.pending_amount)} sedang berjalan</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="mk-stat">
          <div className="mk-stat-label">Tersedia</div>
          <div className="mk-stat-value">{available.length}</div>
          <div className="mk-stat-sub">dalam area</div>
        </div>
        <div className="mk-stat">
          <div className="mk-stat-label">Berjalan</div>
          <div className="mk-stat-value">{myJobs.filter((j) => j.status === 'ON_GOING' || j.status === 'ACCEPTED').length}</div>
          <div className="mk-stat-sub">hari ini</div>
        </div>
        <div className="mk-stat">
          <div className="mk-stat-label">Total penghasilan</div>
          <div className="mk-stat-value" style={{ color: 'var(--brand)', fontSize: 22 }}>{rp(summary.total_earned)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="mk-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="mk-tabs">
            {[
              { id: 'available', label: `Job Tersedia (${available.length})` },
              { id: 'my-jobs',   label: `Job Saya (${myJobs.length})` },
              { id: 'earnings',  label: 'Penghasilan' },
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

        {tab === 'available' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {available.length === 0 ? (
              <div className="mk-empty">
                <div className="mk-empty-icon"><Icon name="truck" size={44} /></div>
                <div className="mk-empty-title">Tidak ada job tersedia</div>
                <div className="mk-empty-sub">Cek kembali nanti, order baru akan muncul di sini.</div>
              </div>
            ) : (
              available.map((order) => (
                <JobCard
                  key={order.id}
                  order={order}
                  onAccept={acceptOrder}
                  accepting={accepting}
                  isMyJob={false}
                />
              ))
            )}
          </div>
        )}

        {tab === 'my-jobs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myJobs.length === 0 ? (
              <div className="mk-empty">
                <div className="mk-empty-icon"><Icon name="package" size={44} /></div>
                <div className="mk-empty-title">Belum ada job aktif</div>
                <div className="mk-empty-sub">Ambil job dari tab "Job Tersedia" untuk mulai bekerja.</div>
              </div>
            ) : (
              myJobs.map((order) => (
                <JobCard key={order.id} order={order} onAccept={acceptOrder} accepting={accepting} isMyJob />
              ))
            )}
          </div>
        )}

        {tab === 'earnings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Monthly breakdown */}
            <div className="mk-card" style={{ padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
                Penghasilan per Bulan
              </div>
              {(earnings?.by_month || []).length === 0 ? (
                <div className="mk-empty" style={{ padding: '1.5rem 0' }}>
                  <div className="mk-empty-title">Belum ada penghasilan</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {earnings.by_month.map((m) => (
                    <div key={m.month} className="mk-row" style={{ justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtMonth(m.month)}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>{m.count} job</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand)' }}>
                        {rp(m.total)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent completed */}
            <div className="mk-card" style={{ padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
                Job Terakhir Selesai
              </div>
              {(earnings?.recent_completed || []).length === 0 ? (
                <div className="mk-empty" style={{ padding: '1rem 0' }}>
                  <div className="mk-empty-title">Belum ada job selesai</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {earnings.recent_completed.map((j) => (
                    <div
                      key={j.id}
                      onClick={() => navigate(`/moving-orders/${j.id}`)}
                      className="mk-row"
                      style={{
                        justifyContent: 'space-between', padding: '11px 14px',
                        border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                        cursor: 'pointer', transition: 'background .1s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }} className="mk-truncate">
                          {j.pickup_location?.split(',')[0]} → {j.dropoff_location?.split(',')[0]}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>
                          {j.user_name} · {j.distance_km} km · {fmt(j.created_at)}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--ok)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                        +{rp(j.estimated_price)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
