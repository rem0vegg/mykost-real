import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Chat({ orderId, toUserId, orderType = 'survey' }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const type = orderType === 'moving' ? 'moving' : 'survey';
      const { data } = await api.get(`/api/messages/${orderId}?type=${type}`);
      setMessages(data.messages);
    } catch {}
  }, [orderId, orderType]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="chat-box">
      <div className="chat-messages">
        {messages.length === 0 && (
          <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '2rem', fontSize: '0.88rem' }}>
            Belum ada pesan. Mulai percakapan!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.from_user_id === user.id;
          return (
            <div key={m.id} className={`chat-bubble ${mine ? 'mine' : 'theirs'}`}>
              {!mine && <div className="chat-bubble-name">{m.from_name}</div>}
              {m.message_text}
              <div className="chat-bubble-time">{fmt(m.created_at)}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-row" onSubmit={send}>
        <input
          className="form-control"
          placeholder="Tulis pesan..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
          maxLength={500}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !text.trim()}>
          Kirim
        </button>
      </form>
    </div>
  );
}
