import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import Icon from './Icon';

export default function Chat({ orderId, toUserId, orderType = 'survey' }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const type = orderType === 'moving' ? 'moving' : 'survey';
      const { data } = await api.get(`/api/messages/${orderId}?type=${type}`);
      setMessages(data.messages);
    } catch {}
  }, [orderId, orderType]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (!messagesRef.current || messages.length === 0) return;
    const lastId = messages[messages.length - 1].id;
    if (lastId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = lastId;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const body = { message_text: text.trim(), to_user_id: toUserId };
      if (orderType === 'moving') body.moving_order_id = orderId;
      const { data } = await api.post(`/api/messages/${orderId}`, body);
      setMessages((prev) => [...prev, data.message]);
      setText('');
    } catch {
    } finally {
      setSending(false);
    }
  };

  const fmt = (ts) =>
    new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mk-chat">
      <div className="mk-chat-messages" ref={messagesRef}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: 13, color: 'var(--ink-mute)' }}>
            Belum ada pesan. Mulai percakapan!
          </div>
        )}
        {messages.map((m) => {
          const mine = m.from_user_id === user.id;
          return (
            <div key={m.id} className={`mk-chat-bubble ${mine ? 'mine' : 'theirs'}`}>
              {!mine && (
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 3, opacity: .7 }}>{m.from_name}</div>
              )}
              {m.message_text}
              <div style={{ fontSize: 10, marginTop: 4, opacity: .6, textAlign: mine ? 'right' : 'left' }}>
                {fmt(m.created_at)}
              </div>
            </div>
          );
        })}
      </div>
      <form className="mk-chat-input-row" onSubmit={send}>
        <input
          className="mk-input"
          style={{ flex: 1, fontSize: 13 }}
          placeholder="Tulis pesan..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
          maxLength={500}
        />
        <button
          className="mk-btn mk-btn-primary mk-btn-sm"
          type="submit"
          disabled={sending || !text.trim()}
          style={{ flexShrink: 0 }}
        >
          <Icon name="arrow-right" size={15} />
        </button>
      </form>
    </div>
  );
}
