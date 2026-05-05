import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';
import Chat from '../components/Chat';

export default function MovingOrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusForm, setStatusForm] = useState({ status: '', note: '' });
  const [updating, setUpdating] = useState(false);
  const [err, setErr] = useState('');
  const [showStatusForm, setShowStatusForm] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/api/moving-orders/${id}`);
      setOrder(data.order);
      setHistory(data.history);
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const updateStatus = async (e) => {
    e.preventDefault();
    setUpdating(true); setErr('');
    try {
      const { data } = await api.put(`/api/moving-orders/${id}/status`, statusForm);
      setOrder(data.order);
      await fetchOrder();
      setShowStatusForm(false);
      setStatusForm({ status: '', note: '' });
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="spinner" />;
  if (!order) return null;

  const isMover = user.role === 'mover' && order.mover_id === user.id;
  const otherUserId = user.role === 'user' ? order.mover_id : order.user_id;
  const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className="page">
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem' }}>
        ← Back
      </button>

      <div className="grid-2">
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div className="card-title">Moving Order</div>
                <StatusBadge status={order.status} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div><strong>Pickup:</strong> {order.pickup_location}</div>
              <div><strong>Delivery:</strong> {order.delivery_location}</div>
              {order.description && <div><strong>Description:</strong> {order.description}</div>}
              <div><strong>Budget:</strong> {order.budget ? `Rp ${order.budget.toLocaleString('id-ID')}` : '—'}</div>
              <div><strong>Scheduled Date:</strong> {fmt(order.scheduled_date)}</div>
              <div><strong>Created:</strong> {fmt(order.created_at)}</div>
              {order.mover_id && (
                <div><strong>Mover:</strong> {order.mover_name} {order.mover_phone && `(${order.mover_phone})`}</div>
              )}
              {user.role === 'mover' && (
                <div><strong>Client:</strong> {order.user_name} {order.user_phone && `(${order.user_phone})`}</div>
              )}
            </div>

            {isMover && order.status !== 'completed' && order.status !== 'cancelled' && (
              <div style={{ marginTop: '1rem' }}>
                {!showStatusForm ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowStatusForm(true)}>
                    Update Status
                  </button>
                ) : (
                  <form onSubmit={updateStatus} style={{ marginTop: '0.5rem' }}>
                    {err && <div className="alert alert-error">{err}</div>}
                    <div className="form-group">
                      <label className="form-label">New Status</label>
                      <select
                        className="form-control"
                        value={statusForm.status}
                        onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                        required
                      >
                        <option value="">Select status...</option>
                        {order.status !== 'in_progress' && <option value="in_progress">In Progress</option>}
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Note (optional)</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={statusForm.note}
                        onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                        placeholder="Add a note..."
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" type="submit" disabled={updating}>
                        {updating ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowStatusForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: '1rem' }}>Status History</div>
            <StatusTimeline history={history} />
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Chat</div>
          {otherUserId ? (
            <Chat orderId={id} toUserId={otherUserId} orderType="moving" />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <p>Chat will be available once a mover accepts this order.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
