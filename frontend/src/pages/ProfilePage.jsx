import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import KotaSelect from '../components/KotaSelect';

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [form, setForm] = useState({ name: '', phone: '', location: '', kota: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        kota: user.kota || '',
      });
    }
  }, [user]);

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

  if (!user) return <div className="spinner" />;

  return (
    <div className="page">
      <div className="page-title">Profil Saya</div>
      <div className="grid-2">
        <div>
          <div className="card">
            <div className="card-title">Info Akun</div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span className={`role-badge role-${user.role}`}>{user.role}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Email: {user.email}</p>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.3rem' }}>
              Bergabung: {new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="card">
            <div className="card-title">Edit Profil</div>
            {msg && <div className="alert alert-success">{msg}</div>}
            {err && <div className="alert alert-error">{err}</div>}
            <form onSubmit={saveProfile}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Nomor HP</label>
                <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="form-group">
                <label className="form-label">Alamat / Lokasi</label>
                <input className="form-control" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Contoh: Jakarta Selatan" />
              </div>

              {/* Kota field only for agents */}
              {user.role === 'agent' && (
                <div className="form-group">
                  <label className="form-label">Kota Operasional</label>
                  <KotaSelect
                    value={form.kota}
                    onChange={(kota) => setForm({ ...form, kota })}
                    placeholder="Pilih kota operasional..."
                  />
                  <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                    Order survey dari kota ini akan dikirim ke Anda.
                  </span>
                </div>
              )}

              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Ubah Password</div>
          {pwMsg && <div className="alert alert-success">{pwMsg}</div>}
          {pwErr && <div className="alert alert-error">{pwErr}</div>}
          <form onSubmit={changePassword}>
            <div className="form-group">
              <label className="form-label">Password Saat Ini</label>
              <input className="form-control" type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password Baru <span style={{ color: '#9ca3af', fontWeight: 400 }}>(min 6 karakter)</span></label>
              <input className="form-control" type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
            </div>
            <button className="btn btn-secondary" type="submit" disabled={changingPw}>
              {changingPw ? 'Mengubah...' : 'Ubah Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
