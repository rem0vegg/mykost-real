import { useState, useEffect } from 'react';
import api from '../services/api';
import Icon from './Icon';

export default function ReviewForm({ orderId, orderType, revieweeName, onSubmitted }) {
  const [existing, setExisting] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [rating, setRating]     = useState(5);
  const [hoverRating, setHover] = useState(0);
  const [comment, setComment]   = useState('');
  const [submitting, setSubmit] = useState(false);
  const [err, setErr]           = useState('');

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
    return (
      <div className="mk-card" style={{ padding: 20 }}>
        <div className="mk-row" style={{ gap: 8, marginBottom: 10 }}>
          <Icon name="star" size={16} style={{ color: '#f59e0b' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Ulasan Anda</div>
        </div>
        <div className="mk-row" style={{ gap: 4, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Icon
              key={n}
              name="star"
              size={18}
              style={{ color: n <= existing.rating ? '#f59e0b' : 'var(--line-strong)', fill: n <= existing.rating ? '#f59e0b' : 'none' }}
            />
          ))}
          <span style={{ fontSize: 13, color: 'var(--ink-mute)', marginLeft: 6 }}>{existing.rating}/5</span>
        </div>
        {existing.comment && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 14, wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {existing.comment}
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 8 }}>
          Dikirim {new Date(existing.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    );
  }

  return (
    <div className="mk-card" style={{ padding: 20 }}>
      <div className="mk-row" style={{ gap: 8, marginBottom: 4 }}>
        <Icon name="star" size={16} style={{ color: '#f59e0b' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Beri Ulasan</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 16 }}>
        Bagaimana pengalaman Anda dengan {revieweeName || (orderType === 'survey' ? 'agent' : 'mover')}?
      </div>

      <form onSubmit={submit}>
        {err && <div className="mk-alert mk-alert-err" style={{ marginBottom: 12 }}>{err}</div>}

        <div className="mk-field" style={{ marginBottom: 14 }}>
          <label className="mk-label">Rating</label>
          <div className="mk-row" style={{ gap: 4, marginTop: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (hoverRating || rating) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', lineHeight: 0 }}
                >
                  <Icon name="star" size={24} style={{ color: active ? '#f59e0b' : 'var(--line-strong)', fill: active ? '#f59e0b' : 'none', transition: 'color .1s' }} />
                </button>
              );
            })}
            <span style={{ fontSize: 13, color: 'var(--ink-mute)', alignSelf: 'center', marginLeft: 6 }}>{rating}/5</span>
          </div>
        </div>

        <div className="mk-field" style={{ marginBottom: 14 }}>
          <label className="mk-label">Komentar (opsional)</label>
          <textarea
            className="mk-input"
            rows={3}
            maxLength={1000}
            placeholder="Cerita pengalamanmu..."
            style={{ resize: 'vertical' }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <button className="mk-btn mk-btn-primary mk-btn-sm" type="submit" disabled={submitting}>
          {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
        </button>
      </form>
    </div>
  );
}
