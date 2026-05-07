import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

const rp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtMonth = (ym) => {
  const [y, m] = ym.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

export default function MoverDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('available');
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

  const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID') : '—';

  if (loading) return <div className="spinner" />;

  const summary = earnings?.summary || {};

  return (
    <div className="page">
      <div className="page-title">Mover Dashboard</div>

      {/* Earnings overview */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="stat-number" style={{ color: '#059669', fontSize: '1.4rem' }}>{rp(summary.total_earned)}</div>
          <div className="stat-label">Total Penghasilan</div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid #0f3460' }}>
          <div className="stat-number" style={{ color: '#0f3460', fontSize: '1.4rem' }}>{rp(summary.this_month)}</div>
          <div className="stat-label">Bulan Ini</div>
        </div>
        <div className="stat-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="stat-number" style={{ color: '#d97706', fontSize: '1.4rem' }}>{rp(summary.pending_amount)}</div>
          <div className="stat-label">Sedang Berjalan</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'available' ? 'active' : ''}`} onClick={() => setTab('available')}>
          Available ({available.length})
        </button>
        <button className={`tab-btn ${tab === 'my-jobs' ? 'active' : ''}`} onClick={() => setTab('my-jobs')}>
          My Jobs ({myJobs.length})
        </button>
        <button className={`tab-btn ${tab === 'earnings' ? 'active' : ''}`} onClick={() => setTab('earnings')}>
          💰 Penghasilan
        </button>
      </div>

      {tab === 'available' && (
        <>
          {available.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🚚</div>
              <p>No moving orders available right now. Check back later!</p>
            </div>
          ) : (
            available.map((order) => (
              <div key={order.id} className="order-card" style={{ borderLeftColor: '#0f3460' }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-card-title">{order.pickup_location} → {order.dropoff_location}</div>
                    <div className="order-meta">
                      {order.move_type} · {order.vehicle_type} · {order.distance_km} km · {fmt(order.scheduled_date)}
                    </div>
                    <div className="order-meta" style={{ fontWeight: 600, color: '#0f3460' }}>
                      Rp {Number(order.estimated_price).toLocaleString('id-ID')}
                      {order.has_large_items && ' · ⚠️ Barang besar'}
                    </div>
                    <div className="order-meta">Pemesan: {order.user_name} {order.user_phone && `(${order.user_phone})`}</div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="order-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => acceptOrder(order.id)}
                    disabled={accepting === order.id}
                  >
                    {accepting === order.id ? 'Accepting...' : 'Accept Job'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(`/moving-orders/${order.id}`)}>
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === 'my-jobs' && (
        <>
          {myJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <p>You haven't accepted any jobs yet.</p>
            </div>
          ) : (
            myJobs.map((order) => (
              <div key={order.id} className="order-card" style={{ borderLeftColor: order.status === 'INVALID' ? '#ef4444' : '#0f3460' }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-card-title">{order.pickup_location} → {order.dropoff_location}</div>
                    <div className="order-meta">
                      {order.move_type} · {order.vehicle_type} · {order.distance_km} km · {fmt(order.scheduled_date)}
                    </div>
                    <div className="order-meta" style={{ fontWeight: 600 }}>
                      {order.final_price
                        ? `Final: Rp ${Number(order.final_price).toLocaleString('id-ID')}`
                        : `Estimasi: Rp ${Number(order.estimated_price).toLocaleString('id-ID')}`}
                    </div>
                    <div className="order-meta">Pemesan: {order.user_name}</div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="order-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/moving-orders/${order.id}`)}>
                    Manage Job
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === 'earnings' && (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>💰 Ringkasan Penghasilan</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '0.85rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>Total Diterima</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>{rp(summary.total_earned)}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{summary.completed_count || 0} job selesai</div>
              </div>
              <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '0.85rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600 }}>Bulan Ini</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f3460', marginTop: '0.25rem' }}>{rp(summary.this_month)}</div>
              </div>
              <div style={{ background: '#fef3c7', borderRadius: 8, padding: '0.85rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>Sedang Berjalan</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem' }}>{rp(summary.pending_amount)}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{summary.in_progress_count || 0} job aktif</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>📅 Penghasilan per Bulan</div>
            {(earnings?.by_month || []).length === 0 ? (
              <div className="empty-state" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.88rem', color: '#9ca3af' }}>Belum ada penghasilan tercatat.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {earnings.by_month.map((m) => (
                  <div key={m.month} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.6rem 0.85rem', background: '#f9fafb', borderRadius: 6,
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{fmtMonth(m.month)}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{m.count} job</div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#059669' }}>{rp(m.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: '1rem' }}>🕒 Pembayaran Terakhir</div>
            {(earnings?.recent_completed || []).length === 0 ? (
              <div className="empty-state" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.88rem', color: '#9ca3af' }}>Belum ada job yang selesai.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {earnings.recent_completed.map((j) => (
                  <div key={j.id} onClick={() => navigate(`/moving-orders/${j.id}`)}
                    style={{
                      padding: '0.6rem 0.85rem', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid #e5e7eb',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-word' }}>
                          {j.pickup_location?.split(',')[0]} → {j.dropoff_location?.split(',')[0]}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>
                          {j.user_name} · {j.distance_km} km · {fmt(j.created_at)}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                        +{rp(j.estimated_price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
