import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import StatusBadge from '../components/StatusBadge';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [commissions, setCommissions] = useState([]); // State untuk Commission Tracking
  const [noKota, setNoKota] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  const fetchData = async () => {
    try {
      // Menambahkan fetch untuk komisi agen
      const [a, m, c] = await Promise.all([
        api.get('/api/survey-orders/available'),
        api.get('/api/survey-orders/my-orders'),
        api.get('/api/survey-orders/agent/commissions').catch(() => ({ data: { list: [] } }))
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

  const stats = {
    available: available.length,
    active: myOrders.filter((o) => o.status === 'assigned').length,
    completed: myOrders.filter((o) => o.status === 'completed').length,
  };

  // Kalkulasi total komisi
  const totalCommission = commissions.reduce((acc, curr) => acc + curr.amount, 0);

  if (loading) return <div className="spinner" />;

  return (
    <div className="page">
      <div className="page-title">Dashboard Agent</div>

      {/* Kota warning */}
      {noKota && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          ⚠️ Kota belum diatur. <strong>
            <a href="/profile" style={{ color: 'inherit', textDecoration: 'underline' }}>Set kota di Profil</a>
          </strong> agar bisa melihat dan menerima order survey.
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card"><div className="stat-number">{stats.available}</div><div className="stat-label">Order Tersedia</div></div>
        <div className="stat-card"><div className="stat-number">{stats.active}</div><div className="stat-label">Sedang Dikerjakan</div></div>
        <div className="stat-card"><div className="stat-number">{stats.completed}</div><div className="stat-label">Selesai</div></div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'available' ? 'active' : ''}`} onClick={() => setTab('available')}>
          Tersedia ({available.length})
        </button>
        <button className={`tab-btn ${tab === 'my-orders' ? 'active' : ''}`} onClick={() => setTab('my-orders')}>
          Pekerjaan Saya ({myOrders.length})
        </button>
        {/* Tab Baru: Commission Tracking */}
        <button className={`tab-btn ${tab === 'commissions' ? 'active' : ''}`} onClick={() => setTab('commissions')}>
          Komisi Saya
        </button>
      </div>

      {tab === 'available' && (
        <>
          {!noKota && user?.kota && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
              Menampilkan order di area: <strong>{user.kota}</strong>
            </p>
          )}
          {available.length === 0 && !noKota ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <p>Tidak ada order tersedia di kota Anda saat ini.</p>
            </div>
          ) : (
            available.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div style={{ flex: 1 }}>
                    <div className="order-card-title">{order.kost_name}</div>
                    <div className="order-meta">{order.address?.slice(0, 80)}{order.address?.length > 80 ? '...' : ''}</div>
                    <div className="order-meta">
                      {order.kecamatan && `${order.kecamatan}, `}{order.kota}
                    </div>
                    <div className="order-meta">Klien: {order.user_name} {order.user_phone && `· ${order.user_phone}`}</div>
                    {order.notes && (
                      <div className="order-meta" style={{ marginTop: '0.3rem', fontStyle: 'italic' }}>
                        Catatan: {order.notes}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="order-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => acceptOrder(order.id)}
                    disabled={accepting === order.id}
                  >
                    {accepting === order.id ? 'Menerima...' : '✅ Terima Order'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(`/survey-orders/${order.id}`)}>
                    Lihat Detail
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === 'my-orders' && (
        <>
          {myOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>Belum ada order yang Anda terima.</p>
            </div>
          ) : (
            myOrders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <div className="order-card-title">{order.kost_name}</div>
                    <div className="order-meta">{order.kecamatan && `${order.kecamatan}, `}{order.kota}</div>
                    <div className="order-meta">Klien: {order.user_name}</div>
                    {order.status === 'assigned' && (
                      <div className="order-meta" style={{ color: '#10b981', fontWeight: 600 }}>📸 Kirim hasil survei</div>
                    )}
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="order-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/survey-orders/${order.id}`)}>
                    {order.status === 'assigned' ? 'Kirim Hasil Survei' : 'Lihat Detail'}
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Bagian Commission Tracking */}
      {tab === 'commissions' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <div className="card-title" style={{ color: '#065f46' }}>Total Estimasi Komisi</div>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#047857' }}>
              Rp {totalCommission.toLocaleString('id-ID')}
            </p>
          </div>

          {commissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <p>Belum ada data komisi tercatat.</p>
            </div>
          ) : (
            commissions.map((comm) => (
              <div key={comm.id} className="order-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="order-card-title">Order #{comm.orderId}</div>
                  <div className="order-meta">Tanggal: {new Date(comm.date).toLocaleDateString('id-ID')}</div>
                  <div className="order-meta">
                    Status: <strong style={{ color: comm.status === 'Paid' ? '#10b981' : '#f59e0b' }}>{comm.status}</strong>
                  </div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#374151' }}>
                  + Rp {comm.amount.toLocaleString('id-ID')}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}