import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function MoverDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  const fetchData = async () => {
    try {
      const [a, m] = await Promise.all([
        api.get('/api/moving-orders/available'),
        api.get('/api/moving-orders/my-jobs'),
      ]);
      setAvailable(a.data.orders);
      setMyJobs(m.data.orders);
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

  const stats = {
    available: available.length,
    active: myJobs.filter((o) => ['ACCEPTED','ON_GOING'].includes(o.status)).length,
    completed: myJobs.filter((o) => o.status === 'COMPLETED').length,
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="page">
      <div className="page-title">Mover Dashboard</div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card"><div className="stat-number">{stats.available}</div><div className="stat-label">Available Jobs</div></div>
        <div className="stat-card"><div className="stat-number">{stats.active}</div><div className="stat-label">Active Jobs</div></div>
        <div className="stat-card"><div className="stat-number">{stats.completed}</div><div className="stat-label">Completed</div></div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'available' ? 'active' : ''}`} onClick={() => setTab('available')}>
          Available ({available.length})
        </button>
        <button className={`tab-btn ${tab === 'my-jobs' ? 'active' : ''}`} onClick={() => setTab('my-jobs')}>
          My Jobs ({myJobs.length})
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
    </div>
  );
}
