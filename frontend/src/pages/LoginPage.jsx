import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const set = (k, v) => { clearError(); setForm((f) => ({ ...f, [k]: v })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
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
          <h1>Hidup di kota baru, dimulai dari sini.</h1>
          <p>
            Satu platform untuk cari kost, atur survei, sampai layanan pindahan.
            Semua dalam satu akun yang tumbuh bersama Anda.
          </p>
          <div className="hero-features">
            <div className="hero-feature">
              <span className="hero-feature-bullet">✓</span>
              <span>Survei kost on-demand oleh surveyor lokal terpercaya</span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-bullet">✓</span>
              <span>Layanan pindahan dengan harga transparan & tracking real-time</span>
            </div>
            <div className="hero-feature">
              <span className="hero-feature-bullet">✓</span>
              <span>Bisa jadi mitra mover atau surveyor kapan saja</span>
            </div>
          </div>
        </div>
        <div className="hero-foot">© {new Date().getFullYear()} MyKost. Build trust, move smart.</div>
      </aside>

      <main className="auth-shell-form">
        <div className="auth-card">
          <div className="auth-card-title">Selamat datang kembali</div>
          <div className="auth-card-sub">Masuk ke akun MyKost Anda untuk lanjut.</div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="label-modern">Email</label>
              <input
                className="input-modern"
                type="email"
                placeholder="nama@email.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label-modern">Password</label>
              <input
                className="input-modern"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn-modern is-brand" type="submit" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
            Belum punya akun?{' '}
            <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 600 }}>Daftar gratis</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
