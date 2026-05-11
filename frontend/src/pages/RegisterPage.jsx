import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Icon from '../components/Icon';

const ROLES = [
  {
    id: 'customer',
    icon: 'home',
    title: 'Pengguna',
    desc: 'Saya ingin memesan survei kost atau layanan pindahan.',
  },
  {
    id: 'mover',
    icon: 'truck',
    title: 'Mover / Jasa Angkut',
    desc: 'Saya ingin bergabung sebagai mitra layanan pindahan.',
  },
  {
    id: 'surveyor',
    icon: 'clipboard',
    title: 'Surveyor',
    desc: 'Saya ingin menjadi surveyor kost dan dibayar per kunjungan.',
  },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', account_type: 'customer' });
  const [validErr, setValidErr] = useState('');
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const set = (k, v) => { clearError(); setValidErr(''); setForm((f) => ({ ...f, [k]: v })); };

  const validateStep1 = () => {
    if (form.name.trim().length < 2)  return 'Nama minimal 2 karakter';
    if (form.password.length < 6)     return 'Password minimal 6 karakter';
    const ph = form.phone;
    if (ph.length < 10 || ph.length > 13) return 'Nomor HP harus 10–13 digit';
    return null;
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    const err = validateStep1();
    if (err) return setValidErr(err);
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      const { redirect } = await register(form);
      navigate(redirect || '/onboarding');
    } catch {}
  };

  return (
    <div className="auth-shell">
      <aside className="auth-shell-hero">
        <div>
          <div className="hero-brand">MyKost</div>
        </div>
        <div>
          <h1>Daftar sesuai kebutuhan Anda.</h1>
          <p>
            Pilih peran yang tepat dari awal — pengguna, mover, atau surveyor.
            Setiap akun dirancang khusus agar pengalaman Anda lebih mudah.
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
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            {[1, 2].map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: step >= s ? 'var(--brand)' : 'var(--surface-2)',
                  color: step >= s ? '#fff' : 'var(--ink-mute)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {step > s ? '✓' : s}
                </div>
                <span style={{ fontSize: 12, color: step >= s ? 'var(--ink)' : 'var(--ink-mute)', fontWeight: step >= s ? 600 : 400 }}>
                  {s === 1 ? 'Data akun' : 'Pilih peran'}
                </span>
                {s < 2 && <div style={{ width: 20, height: 1, background: 'var(--line-strong)', margin: '0 2px' }} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="auth-card-title">Buat akun gratis</div>
              <div className="auth-card-sub">Hanya butuh 30 detik untuk mulai.</div>

              {(error || validErr) && <div className="alert alert-error">{validErr || error}</div>}

              <form onSubmit={handleStep1}>
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
                  <div className="help-modern">10–13 digit, contoh: 0812345678901</div>
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
                  Lanjutkan →
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
                Sudah punya akun?{' '}
                <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Masuk</Link>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="auth-card-title">Apa peran Anda?</div>
              <div className="auth-card-sub" style={{ marginBottom: 20 }}>
                Pilihan ini menentukan fitur yang tersedia di akun Anda.{' '}
                <strong>Tidak bisa diubah setelah mendaftar</strong> — buat akun baru jika ingin peran berbeda.
              </div>

              {(error || validErr) && <div className="alert alert-error">{validErr || error}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {ROLES.map((role) => {
                  const selected = form.account_type === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => set('account_type', role.id)}
                      style={{
                        border: `2px solid ${selected ? 'var(--brand)' : 'var(--line-strong)'}`,
                        borderRadius: 'var(--r-md)',
                        background: selected ? 'var(--brand-soft)' : 'var(--surface)',
                        padding: '14px 16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                        transition: 'all .12s',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--r-sm)',
                        background: selected ? 'var(--brand)' : 'var(--surface-2)',
                        color: selected ? '#fff' : 'var(--ink-mute)',
                        display: 'grid', placeItems: 'center', flexShrink: 0,
                      }}>
                        <Icon name={role.icon} size={18} stroke={1.75} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 700, fontSize: 14,
                          color: selected ? 'var(--brand-ink)' : 'var(--ink)',
                          marginBottom: 2,
                        }}>
                          {role.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{role.desc}</div>
                      </div>
                      {selected && (
                        <div style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }}>
                          <Icon name="check-circle" size={18} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-modern"
                  style={{ background: 'var(--surface-2)', color: 'var(--ink)', flex: '0 0 auto', padding: '0 18px' }}
                  type="button"
                  onClick={() => setStep(1)}
                >
                  ← Kembali
                </button>
                <button
                  className="btn-modern is-brand"
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Membuat akun...' : 'Daftar Sekarang'}
                </button>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--ink-mute)', textAlign: 'center', marginTop: '1rem' }}>
                Dengan mendaftar, Anda menyetujui Syarat & Ketentuan serta Kebijakan Privasi MyKost.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
