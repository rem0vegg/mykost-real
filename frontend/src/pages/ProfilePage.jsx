import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import KotaSelect from '../components/KotaSelect';
import Icon from '../components/Icon';

const TABS = [
  { id: 'profile',  icon: 'user',    label: 'Informasi Pribadi' },
  { id: 'security', icon: 'shield',  label: 'Keamanan' },
];

function Section({ title, sub, children }) {
  return (
    <div className="mk-card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-.01em' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="mk-field" style={{ marginBottom: 16 }}>
      <label className="mk-label">{label}</label>
      {children}
      {hint && <div className="mk-help">{hint}</div>}
    </div>
  );
}

function StarRating({ rating, count }) {
  const filled = Math.round(rating || 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1,2,3,4,5].map((s) => (
          <Icon
            key={s}
            name="star"
            size={16}
            style={{
              color: s <= filled ? '#f59e0b' : 'var(--line-strong)',
              fill: s <= filled ? '#f59e0b' : 'none',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)' }}>
          {rating ? Number(rating).toFixed(1) : '—'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
          / 5 · {count} ulasan
        </span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({ name: '', phone: '', location: '', kota: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [ratingSummary, setRatingSummary] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '', location: user.location || '', kota: user.kota || '' });
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const isProvider = user.role === 'agent' || user.role === 'mover';
    if (!isProvider) return;
    api.get(`/api/reviews?reviewee_id=${user.id}`)
      .then(({ data }) => setRatingSummary(data.summary))
      .catch(() => {});
  }, [user?.id, user?.role]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setErr('');
    try {
      await api.put('/api/users/profile', form);
      await fetchMe();
      setMsg('Profil berhasil diperbarui.');
    } catch (error) {
      setErr(error.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setChangingPw(true); setPwMsg(''); setPwErr('');
    try {
      await api.post('/api/users/change-password', pwForm);
      setPwMsg('Password berhasil diubah.');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      setPwErr(error.response?.data?.error || 'Gagal mengubah password');
    } finally {
      setChangingPw(false);
    }
  };

  if (!user) return <div className="mk-loading"><div className="mk-spinner" /></div>;

  const roleLabel = { customer: 'Penyewa', agent: 'Surveyor', mover: 'Mover' }[user.role] || user.role;
  const joined = new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const isProvider = user.role === 'agent' || user.role === 'mover';

  return (
    <div className="mk-page">
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink-mute)', fontWeight: 500 }}>Akun</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-.02em' }}>
          Profil Saya
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div className="mk-card" style={{ padding: '8px 6px' }}>
            {/* Avatar + name */}
            <div style={{ padding: '12px 10px 14px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--r-pill)',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
                marginBottom: 8,
              }}>
                {user.name?.[0] || 'U'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{user.name}</div>
              <span className="mk-pill mk-pill-info" style={{ marginTop: 5, fontSize: 11 }}>
                {roleLabel}
              </span>

              {/* Rating for agents/movers */}
              {isProvider && ratingSummary && ratingSummary.count > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    Rating
                  </div>
                  <StarRating rating={ratingSummary.average} count={ratingSummary.count} />
                </div>
              )}
              {isProvider && ratingSummary && ratingSummary.count === 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-mute)' }}>
                  Belum ada ulasan
                </div>
              )}
            </div>

            {/* Tab buttons */}
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '9px 10px',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: activeTab === t.id ? 'var(--brand-soft)' : 'transparent',
                  color: activeTab === t.id ? 'var(--brand-ink)' : 'var(--ink-soft)',
                  fontFamily: 'var(--font-body)',
                  transition: 'background .1s, color .1s',
                }}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Account info */}
          <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              Info Akun
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', wordBreak: 'break-all', lineHeight: 1.4 }}>{user.email}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 4 }}>Bergabung {joined}</div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activeTab === 'profile' && (
            <>
              {/* Rating card for providers */}
              {isProvider && ratingSummary && ratingSummary.count > 0 && (
                <div className="mk-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                        Rating & Ulasan
                      </div>
                      <StarRating rating={ratingSummary.average} count={ratingSummary.count} />
                    </div>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: 'var(--brand-soft)', color: 'var(--brand)',
                      display: 'grid', placeItems: 'center',
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>
                          {Number(ratingSummary.average).toFixed(1)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink-mute)', marginTop: 1 }}>/ 5.0</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Section title="Informasi Pribadi" sub="Nama dan kontak yang ditampilkan ke mitra.">
                {msg && <div className="mk-alert mk-alert-ok" style={{ marginBottom: 16 }}>{msg}</div>}
                {err && <div className="mk-alert mk-alert-err" style={{ marginBottom: 16 }}>{err}</div>}
                <form onSubmit={saveProfile}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field label="Nama Lengkap">
                      <input
                        className="mk-input"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Nomor HP">
                      <input
                        className="mk-input"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="08xxxxxxxxxx"
                      />
                    </Field>
                  </div>
                  <Field label="Alamat / Lokasi" hint="Digunakan untuk estimasi jarak.">
                    <input
                      className="mk-input"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Contoh: Jakarta Selatan"
                    />
                  </Field>
                  {user.role === 'agent' && (
                    <Field label="Kota Operasional" hint="Order survei dari kota ini akan dikirim ke Anda.">
                      <KotaSelect value={form.kota} onChange={(kota) => setForm({ ...form, kota })} placeholder="Pilih kota..." />
                    </Field>
                  )}
                  <button className="mk-btn mk-btn-primary" type="submit" disabled={saving} style={{ marginTop: 4 }}>
                    {saving ? 'Menyimpan...' : (
                      <><Icon name="check" size={15} /> Simpan Perubahan</>
                    )}
                  </button>
                </form>
              </Section>
            </>
          )}

          {activeTab === 'security' && (
            <Section title="Ubah Password" sub="Gunakan password yang kuat dan unik.">
              {pwMsg && <div className="mk-alert mk-alert-ok" style={{ marginBottom: 16 }}>{pwMsg}</div>}
              {pwErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 16 }}>{pwErr}</div>}
              <form onSubmit={changePassword} style={{ maxWidth: 400 }}>
                <Field label="Password Saat Ini">
                  <input
                    className="mk-input"
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <Field label="Password Baru" hint="Minimal 6 karakter.">
                  <input
                    className="mk-input"
                    type="password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </Field>
                <button className="mk-btn mk-btn-primary" type="submit" disabled={changingPw} style={{ marginTop: 4 }}>
                  {changingPw ? 'Mengubah...' : (
                    <><Icon name="key" size={15} /> Ubah Password</>
                  )}
                </button>
              </form>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
