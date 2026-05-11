import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [validErr, setValidErr] = useState('');
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const set = (k, v) => { clearError(); setValidErr(''); setForm((f) => ({ ...f, [k]: v })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2)   return setValidErr('Nama minimal 2 karakter');
    if (form.password.length < 6)      return setValidErr('Password minimal 6 karakter');
    const ph = form.phone;
    if (ph.length < 10 || ph.length > 13) return setValidErr('Nomor HP harus 10–13 digit');
    try {
      await register({ ...form, account_type: 'customer' });
      navigate('/dashboard');
    } catch {}
  };

  return (
    <div className="auth-shell">
      <aside className="auth-shell-hero">
        <div>
          <div className="hero-brand">MyKost</div>
        </div>
        <div>
          <h1>Mulai dengan satu akun. Tumbuh sesuai kebutuhan.</h1>
          <p>
            Daftar sekali — pakai untuk apapun. Cari kost hari ini, pesan pindahan besok.
            Tidak ada friction, tidak ada kerumitan.
          </p>
          <div className="hero-features">
            <div className="hero-feature">
              <span className="hero-feature-bullet">✓</span>
              <span>Gratis, tanpa biaya tersembunyi</span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-bullet">✓</span>
              <span>Verifikasi cepat — langsung pakai dalam hitungan menit</span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-bullet">✓</span>
              <span>Saldo digital terlindungi — pembayaran aman di setiap transaksi</span>
            </div>
          </div>
        </div>
        <div className="hero-foot">Aman, terverifikasi, dipakai ribuan pengguna di Indonesia.</div>
      </aside>

      <main className="auth-shell-form">
        <div className="auth-card">
          <div className="auth-card-title">Buat akun gratis</div>
          <div className="auth-card-sub">Hanya butuh 30 detik untuk mulai.</div>

          {(error || validErr) && <div className="alert alert-error">{validErr || error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="label-modern">Nama Lengkap</label>
              <input
                className="input-modern" type="text"
                placeholder="Contoh: Andi Pratama"
                value={form.name} maxLength={60}
                onChange={(e) => set('name', e.target.value)}
                autoComplete="name" required
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="label-modern">Email</label>
              <input
                className="input-modern" type="email"
                placeholder="nama@email.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                autoComplete="email" required
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="label-modern">Nomor HP</label>
              <input
                className="input-modern" type="tel"
                placeholder="08xxxxxxxxxx"
                value={form.phone} maxLength={13}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set('phone', v); }}
                autoComplete="tel" required
              />
              <div className="help-modern">10–13 digit · Untuk komunikasi dengan mitra</div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label-modern">Password</label>
              <input
                className="input-modern" type="password"
                placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="new-password" minLength={6} required
              />
            </div>

            <button className="btn-modern is-brand" type="submit" disabled={loading}>
              {loading ? 'Membuat akun...' : 'Daftar Sekarang'}
            </button>

            <p style={{ fontSize: '0.78rem', color: 'var(--ink-mute)', textAlign: 'center', marginTop: '1rem' }}>
              Dengan mendaftar, Anda menyetujui Syarat & Ketentuan serta Kebijakan Privasi MyKost.
            </p>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>
              Sudah punya akun?{' '}
              <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Masuk</Link>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-mute)' }}>
              Ingin jadi mitra?{' '}
              <Link to="/mitra/register" style={{ color: 'var(--brand)', fontWeight: 600 }}>Daftar sebagai Mitra</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
