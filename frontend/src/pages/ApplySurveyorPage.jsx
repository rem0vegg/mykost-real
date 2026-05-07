import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import KotaSelect from '../components/KotaSelect';

export default function ApplySurveyorPage() {
  const [kota, setKota] = useState('');
  const [bio, setBio]   = useState('');
  const [submitting, setSubmit] = useState(false);
  const [err, setErr]   = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { fetchMe } = useAuthStore();

  const submit = async (e) => {
    e.preventDefault();
    if (!kota) return setErr('Pilih kota operasional');
    setSubmit(true); setErr('');
    try {
      await api.post('/api/me/capabilities/surveyor', {
        kota,
        bio: bio.trim() || null,
      });
      await fetchMe();
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (e) {
      setErr(e.response?.data?.error || 'Gagal mengirim aplikasi');
    } finally {
      setSubmit(false);
    }
  };

  return (
    <div className="apply-shell">
      <div className="apply-container">
        <button className="apply-back" onClick={() => navigate('/onboarding')}>← Kembali</button>

        <div className="apply-card">
          <div className="apply-title">Jadi Surveyor</div>
          <div className="apply-sub">
            Bantu calon penghuni mengecek kost yang mereka incar. Bayaran per kunjungan,
            jadwal fleksibel, mulai dari kota Anda.
          </div>

          {done && <div className="banner-success">✓ Aktivasi berhasil. Anda kini bisa menerima order survei. Mengarahkan...</div>}
          {err && <div className="alert alert-error">{err}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label-modern">Kota operasional</label>
              <KotaSelect
                value={kota}
                onChange={setKota}
                placeholder="Pilih kota tempat Anda beroperasi"
                required
              />
              <div className="help-modern">Order survei dari kota ini akan dikirim ke Anda</div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label-modern">Tentang Anda (opsional)</label>
              <textarea
                className="input-modern"
                rows={3}
                maxLength={500}
                placeholder="Pengalaman, area kekuatan, atau hal yang ingin disampaikan."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <button className="btn-modern is-brand" type="submit" disabled={submitting || done}>
              {submitting ? 'Mengaktifkan...' : 'Aktifkan akun surveyor'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
