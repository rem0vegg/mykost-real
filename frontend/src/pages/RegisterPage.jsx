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
    if (form.phone.length < 10)        return setValidErr('Nomor HP minimal 10 digit');
    try {
      await register(form);
      navigate('/onboarding');
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
            Daftar sekali — pakai untuk apapun. Cari kost hari ini,
            jadi mitra besok. Tidak ada akun terpisah, tidak ada friction.
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
              <span>Aktifkan kemampuan baru kapan saja dari satu dashboard</span>
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
                className="input-modern"
                type="text"
                placeholder="Contoh: Andi Pratama"
                value={form.name}
                maxLength={60}
                onChange={(e) => set('name', e.target.value)}
                autoComplete="name"
                required
              />
            </div>
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
            <div style={{ marginBottom: '1rem' }}>
              <label className="label-modern">Nomor HP</label>
              <input
                className="input-modern"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={form.phone}
                maxLength={15}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set('phone', v); }}
                autoComplete="tel"
                required
              />
              <div className="help-modern">Untuk verifikasi & komunikasi dengan mitra</div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label-modern">Password</label>
              <input
                className="input-modern"
                type="password"
                placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            <button className="btn-modern is-brand" type="submit" disabled={loading}>
              {loading ? 'Membuat akun...' : 'Lanjutkan'}
            </button>

            <p style={{ fontSize: '0.78rem', color: 'var(--ink-mute)', textAlign: 'center', marginTop: '1rem' }}>
              Dengan mendaftar, Anda menyetujui Syarat & Ketentuan serta Kebijakan Privasi MyKost.
            </p>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
            Sudah punya akun?{' '}
            <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Masuk</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
