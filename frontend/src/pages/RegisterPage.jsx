import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import KotaSelect from '../components/KotaSelect';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user', phone: '', kota: '' });
  const [validErr, setValidErr] = useState('');
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const set = (k, v) => { clearError(); setValidErr(''); setForm((f) => ({ ...f, [k]: v })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailUser = form.email.split('@')[0];
    if (emailUser.length > 64) return setValidErr('Username email maksimal 64 karakter sebelum @');
    if (form.phone && form.phone.length < 10) return setValidErr('Nomor HP minimal 10 karakter');
    try {
      await register(form);
      navigate('/dashboard');
    } catch {}
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <div className="auth-title">Buat Akun</div>
        <div className="auth-subtitle">Bergabung dengan MyKost</div>

        {(error || validErr) && <div className="alert alert-error">{validErr || error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap <span style={{ color: '#9ca3af', fontWeight: 400 }}>(maks. 60 karakter)</span></label>
            <input className="form-control" type="text" placeholder="Budi Santoso" value={form.name} maxLength={60} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" placeholder="kamu@email.com" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password <span style={{ color: '#9ca3af', fontWeight: 400 }}>(min 6 karakter)</span></label>
            <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Nomor HP <span style={{ color: '#9ca3af', fontWeight: 400 }}>(10–12 digit)</span></label>
            <input
              className="form-control"
              type="text"
              placeholder="08xxxxxxxxxx"
              value={form.phone}
              maxLength={12}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set('phone', v); }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Saya adalah...</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { value: 'user', label: 'User', desc: 'Cari survey kost' },
                { value: 'agent', label: 'Agent', desc: 'Lakukan survey' },
                { value: 'mover', label: 'Mover', desc: 'Layanan pindahan' },
              ].map(({ value, label, desc }) => (
                <label key={value} style={{
                  flex: 1, border: `2px solid ${form.role === value ? '#e94560' : '#d1d5db'}`,
                  borderRadius: '8px', padding: '0.6rem', cursor: 'pointer', textAlign: 'center',
                  background: form.role === value ? '#fff1f2' : '#fff', transition: 'all 0.15s',
                }}>
                  <input type="radio" name="role" value={value} checked={form.role === value} onChange={() => set('role', value)} style={{ display: 'none' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{desc}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Kota field: required for agent */}
          {form.role === 'agent' && (
            <div className="form-group">
              <label className="form-label">Kota Operasional *</label>
              <KotaSelect
                value={form.kota}
                onChange={(kota) => set('kota', kota)}
                placeholder="Pilih kota operasional..."
                required
              />
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Order survey dari kota ini akan dikirim ke Anda.
              </span>
            </div>
          )}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Membuat akun...' : 'Buat Akun'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: '#6b7280' }}>
          Sudah punya akun?{' '}
          <Link to="/login" style={{ color: '#e94560', fontWeight: 600 }}>Masuk</Link>
        </p>
      </div>
    </div>
  );
}
