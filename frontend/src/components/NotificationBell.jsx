import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Icon from './Icon';

const TYPE_ICON = {
  new_message:      'message',
  moving_accepted:  'check-circle',
  moving_on_going:  'truck',
  moving_completed: 'check-circle',
  moving_mismatch:  'alert-circle',
  survey_assigned:  'user',
  survey_completed: 'check-circle',
};

function fmtRelative(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export default function NotificationBell() {
  const [items, setItems]        = useState([]);
  const [unreadCount, setUnread] = useState(0);
  const [open, setOpen]          = useState(false);
  const containerRef             = useRef(null);
  const navigate                 = useNavigate();
  const lastSigRef               = useRef('');

  const fetchNotifs = async () => {
    try {
      const { data } = await api.get('/api/notifications');
      const sig = `${data.unreadCount}|${(data.notifications || []).map(n => n.id + (n.is_read ? '1' : '0')).join(',')}`;
      if (sig === lastSigRef.current) return;
      lastSigRef.current = sig;
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const tick = () => { if (document.visibilityState === 'visible') fetchNotifs(); };
    const t = setInterval(tick, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchNotifs(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

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
    if (!n.order_id || !n.order_type) return;
    const hash = n.type === 'new_message' ? '#chat' : '';
    const base = n.order_type === 'moving' ? '/moving-orders/' : '/survey-orders/';
    navigate(`${base}${n.order_id}${hash}`);
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
          position: 'relative', color: 'inherit', padding: '6px 8px',
          borderRadius: 'var(--r-sm)', display: 'grid', placeItems: 'center',
          lineHeight: 0,
        }}
      >
        <Icon name="bell" size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: 'var(--err)', color: '#fff',
            borderRadius: 999, fontSize: 10, fontWeight: 700,
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
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderBottom: '1px solid var(--line)',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Notifikasi</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
              Belum ada notifikasi
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                onClick={() => onClickItem(n)}
                style={{
                  display: 'flex', gap: 10,
                  padding: '10px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--line)',
                  background: n.is_read ? 'transparent' : 'var(--brand-soft)',
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--brand-soft)'; }}
              >
                <div style={{ flexShrink: 0, marginTop: 2, color: 'var(--ink-mute)' }}>
                  <Icon name={TYPE_ICON[n.type] || 'bell'} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 13, marginBottom: 2, wordBreak: 'break-word' }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{
                      fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.35, wordBreak: 'break-word',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 3 }}>
                    {fmtRelative(n.created_at)}
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{
                    width: 7, height: 7, background: 'var(--brand)', borderRadius: '50%',
                    flexShrink: 0, marginTop: 5,
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
