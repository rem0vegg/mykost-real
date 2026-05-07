import { useState, useEffect } from 'react';
import api from '../services/api';

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
  open:      { label: 'Diterima',     bg: '#fef3c7', fg: '#92400e' },
  in_review: { label: 'Sedang Ditinjau', bg: '#dbeafe', fg: '#1e40af' },
  resolved:  { label: 'Selesai',      bg: '#d1fae5', fg: '#065f46' },
};

/**
 * Form & list komplain untuk satu order.
 * Props: orderId, orderType
 */
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
    <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div className="card-title" style={{ marginBottom: 0 }}>📢 Komplain</div>
        {!showForm && (
          <button className="btn btn-outline btn-sm" onClick={() => setShowForm(true)}
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}>+ Ajukan Komplain</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ marginBottom: '0.75rem' }}>
          {err && <div className="alert alert-error">{err}</div>}
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Deskripsi</label>
            <textarea className="form-control" rows={3} maxLength={2000}
              placeholder="Jelaskan apa yang terjadi (min. 10 karakter)"
              value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
              {submitting ? 'Mengirim...' : 'Kirim Komplain'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Batal</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        !showForm && <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Belum ada komplain untuk order ini.</div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {items.map((c) => {
            const cfg = COMPLAINT_STATUS[c.status] || COMPLAINT_STATUS.open;
            return (
              <div key={c.id} style={{ background: '#f9fafb', borderRadius: 6, padding: '0.65rem 0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{CAT_LABEL[c.category] || c.category}</div>
                  <span style={{
                    background: cfg.bg, color: cfg.fg, padding: '0.15rem 0.5rem',
                    borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                  }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: '0.85rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{c.description}</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.3rem' }}>
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
