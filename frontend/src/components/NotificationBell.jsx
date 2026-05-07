import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TYPE_ICON = {
  new_message:        '💬',
  moving_accepted:    '✅',
  moving_on_going:    '🚚',
  moving_completed:   '🎉',
  moving_mismatch:    '⚠️',
  survey_assigned:    '👤',
  survey_completed:   '✅',
};

function fmtRelative(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)    return 'baru saja';
  if (m < 60)   return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export default function NotificationBell() {
  const [items, setItems]         = useState([]);
  const [unreadCount, setUnread]  = useState(0);
  const [open, setOpen]           = useState(false);
  const containerRef              = useRef(null);
  const navigate                  = useNavigate();

  const fetchNotifs = async () => {
    try {
      const { data } = await api.get('/api/notifications');
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 15000); // refresh tiap 15 detik
    return () => clearInterval(t);
  }, []);

  // Close dropdown saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onClickItem = async (n) => {
    setOpen(false);
    if (!n.is_read) {
      try { await api.post(`/api/notifications/${n.id}/read`); } catch {}
      await fetchNotifs();
    }
    if (n.order_id && n.order_type === 'moving') navigate(`/moving-orders/${n.order_id}`);
    else if (n.order_id && n.order_type === 'survey') navigate(`/survey-orders/${n.order_id}`);
  };

  const markAllRead = async () => {
    try { await api.post('/api/notifications/mark-all-read'); } catch {}
    await fetchNotifs();
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifikasi"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: '1.3rem', position: 'relative', color: '#fff', padding: '0.25rem 0.5rem',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#e94560', color: '#fff',
            borderRadius: 999, fontSize: '0.65rem', fontWeight: 700,
            minWidth: 16, height: 16, padding: '0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 440, overflowY: 'auto',
          background: '#fff', color: '#1a1a2e',
          border: '1px solid #e5e7eb', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 1000,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6',
          }}>
            <span style={{ fontWeight: 700 }}>Notifikasi</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', color: '#0f3460',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}>Tandai semua dibaca</button>
            )}
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
              Belum ada notifikasi
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                onClick={() => onClickItem(n)}
                style={{
                  display: 'flex', gap: '0.6rem',
                  padding: '0.7rem 1rem', cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  background: n.is_read ? '#fff' : '#f0f9ff',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = n.is_read ? '#fff' : '#f0f9ff'}
              >
                <div style={{ fontSize: '1.1rem', flexShrink: 0 }}>{TYPE_ICON[n.type] || '🔔'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: n.is_read ? 500 : 700, fontSize: '0.85rem',
                    marginBottom: '0.15rem', wordBreak: 'break-word',
                  }}>{n.title}</div>
                  {n.body && (
                    <div style={{
                      fontSize: '0.78rem', color: '#6b7280',
                      lineHeight: 1.35, wordBreak: 'break-word',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>{n.body}</div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    {fmtRelative(n.created_at)}
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{
                    width: 8, height: 8, background: '#e94560', borderRadius: '50%',
                    flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
