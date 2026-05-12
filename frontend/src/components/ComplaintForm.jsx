import { useState, useEffect } from 'react';
import api from '../services/api';
import Icon from './Icon';

const CATEGORIES = [
  { value: 'service_quality', label: 'Kualitas layanan buruk' },
  { value: 'late_delivery',   label: 'Keterlambatan' },
  { value: 'damaged_item',    label: 'Barang rusak/hilang' },
  { value: 'rude_behavior',   label: 'Perilaku tidak sopan' },
  { value: 'wrong_info',      label: 'Informasi tidak sesuai' },
  { value: 'overcharge',      label: 'Biaya tidak wajar' },
  { value: 'other',           label: 'Lainnya' },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const COMPLAINT_STATUS = {
  open:      { cls: 'mk-pill mk-pill-warn', label: 'Diterima' },
  in_review: { cls: 'mk-pill mk-pill-info', label: 'Sedang Ditinjau' },
  resolved:  { cls: 'mk-pill mk-pill-ok',   label: 'Selesai' },
};

export default function ComplaintForm({ orderId, orderType }) {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('service_quality');
  const [desc, setDesc]         = useState('');
  const [submitting, setSubmit] = useState(false);
  const [err, setErr]           = useState('');

  const refresh = async () => {
    try {
      const { data } = await api.get(`/api/complaints/order/${orderType}/${orderId}`);
      setItems(data.complaints);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [orderId, orderType]);

  const submit = async (e) => {
    e.preventDefault();
    if (desc.trim().length < 10) return setErr('Deskripsi minimal 10 karakter');
    setSubmit(true); setErr('');
    try {
      await api.post('/api/complaints', {
        order_id: orderId, order_type: orderType, category,
        description: desc.trim(),
      });
      await refresh();
      setShowForm(false);
      setCategory('service_quality');
      setDesc('');
    } catch (e) {
      setErr(e.response?.data?.error || 'Gagal mengirim komplain');
    } finally {
      setSubmit(false);
    }
  };

  if (loading) return null;

  return (
    <div className="mk-card" style={{ padding: 20 }}>
      <div className="mk-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="mk-row" style={{ gap: 8 }}>
          <Icon name="alert-circle" size={16} style={{ color: 'var(--err)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Komplain</div>
        </div>
        {!showForm && (
          <button
            className="mk-btn mk-btn-ghost mk-btn-sm"
            style={{ color: 'var(--err)', borderColor: 'var(--err)' }}
            onClick={() => setShowForm(true)}
          >
            <Icon name="plus" size={13} /> Ajukan Komplain
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ marginBottom: 14 }}>
          {err && <div className="mk-alert mk-alert-err" style={{ marginBottom: 12 }}>{err}</div>}
          <div className="mk-field" style={{ marginBottom: 14 }}>
            <label className="mk-label">Kategori</label>
            <select className="mk-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="mk-field" style={{ marginBottom: 14 }}>
            <label className="mk-label">Deskripsi</label>
            <textarea
              className="mk-input"
              rows={3}
              maxLength={2000}
              placeholder="Jelaskan apa yang terjadi (min. 10 karakter)"
              style={{ resize: 'vertical' }}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="mk-row" style={{ gap: 10 }}>
            <button className="mk-btn mk-btn-primary mk-btn-sm" type="submit" disabled={submitting}>
              {submitting ? 'Mengirim...' : 'Kirim Komplain'}
            </button>
            <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => setShowForm(false)}>Batal</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        !showForm && (
          <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Belum ada komplain untuk order ini.</div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((c) => {
            const cfg = COMPLAINT_STATUS[c.status] || COMPLAINT_STATUS.open;
            return (
              <div key={c.id} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
                <div className="mk-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{CAT_LABEL[c.category] || c.category}</div>
                  <span className={cfg.cls} style={{ fontSize: 11 }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: 13, wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{c.description}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 6 }}>
                  {new Date(c.created_at).toLocaleString('id-ID')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
