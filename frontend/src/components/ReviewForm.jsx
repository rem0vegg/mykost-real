import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Form ulasan untuk completed order.
 * Props:
 *   orderId, orderType ('survey'|'moving'), revieweeName
 *   onSubmitted() — dipanggil setelah submit sukses
 */
export default function ReviewForm({ orderId, orderType, revieweeName, onSubmitted }) {
  const [existing, setExisting]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [rating, setRating]       = useState(5);
  const [hoverRating, setHover]   = useState(0);
  const [comment, setComment]     = useState('');
  const [submitting, setSubmit]   = useState(false);
  const [err, setErr]             = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/api/reviews/order/${orderType}/${orderId}`);
        setExisting(data.review);
      } catch {}
      setLoading(false);
    })();
  }, [orderId, orderType]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmit(true); setErr('');
    try {
      const { data } = await api.post('/api/reviews', {
        order_id: orderId, order_type: orderType,
        rating, comment: comment.trim() || null,
      });
      setExisting(data.review);
      onSubmitted?.(data.review);
    } catch (e) {
      setErr(e.response?.data?.error || 'Gagal mengirim ulasan');
    } finally {
      setSubmit(false);
    }
  };

  if (loading) return null;

  if (existing) {
    const stars = '⭐'.repeat(existing.rating);
    return (
      <div className="card" style={{ borderLeft: '4px solid #fbbf24' }}>
        <div className="card-title" style={{ marginBottom: '0.5rem' }}>⭐ Ulasan Anda</div>
        <div style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{stars} <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>({existing.rating}/5)</span></div>
        {existing.comment && (
          <div style={{
            background: '#f9fafb', borderRadius: 6, padding: '0.6rem 0.75rem',
            fontSize: '0.88rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
          }}>
            {existing.comment}
          </div>
        )}
        <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.4rem' }}>
          Dikirim {new Date(existing.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ borderLeft: '4px solid #fbbf24' }}>
      <div className="card-title" style={{ marginBottom: '0.5rem' }}>⭐ Beri Ulasan</div>
      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
        Bagaimana pengalaman Anda dengan {revieweeName || (orderType === 'survey' ? 'agent' : 'mover')}?
      </p>
      <form onSubmit={submit}>
        {err && <div className="alert alert-error">{err}</div>}
        <div className="form-group">
          <label className="form-label">Rating</label>
          <div style={{ display: 'flex', gap: '0.25rem', fontSize: '1.6rem' }}>
            {[1,2,3,4,5].map((n) => (
              <span
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                style={{ cursor: 'pointer', filter: (hoverRating || rating) >= n ? 'none' : 'grayscale(100%)', opacity: (hoverRating || rating) >= n ? 1 : 0.4 }}
              >⭐</span>
            ))}
            <span style={{ fontSize: '0.85rem', color: '#6b7280', alignSelf: 'center', marginLeft: '0.5rem' }}>{rating}/5</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Komentar (opsional)</label>
          <textarea className="form-control" rows={3} maxLength={1000}
            placeholder="Cerita pengalamanmu..."
            value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
          {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
        </button>
      </form>
    </div>
  );
}
