import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const VEHICLES = [
  { code: 'MOTORCYCLE', label: 'Motor',       desc: 'Barang ringan: kardus kecil, koper' },
  { code: 'VAN',        label: 'Van',         desc: 'Barang sedang: kasur lipat, perabot' },
  { code: 'PICKUP_BOX', label: 'Pickup Box',  desc: 'Barang besar: lemari, spring bed' },
];

export default function ApplyMoverPage() {
  const [vehicles, setVehicles] = useState([]);
  const [serviceArea, setArea]  = useState('');
  const [bio, setBio]           = useState('');
  const [submitting, setSubmit] = useState(false);
  const [err, setErr]           = useState('');
  const [done, setDone]         = useState(false);
  const navigate = useNavigate();
  const { fetchMe } = useAuthStore();

  const toggle = (code) => {
    setVehicles((v) => v.includes(code) ? v.filter((x) => x !== code) : [...v, code]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (vehicles.length === 0) return setErr('Pilih minimal satu jenis kendaraan');
    setSubmit(true); setErr('');
    try {
      await api.post('/api/me/capabilities/mover', {
        vehicle_types: vehicles,
        service_area:  serviceArea.trim() || null,
        bio:           bio.trim() || null,
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
          <div className="apply-title">Jadi Mitra Mover</div>
          <div className="apply-sub">
            Lengkapi info di bawah untuk mulai menerima order pindahan.
            Aktivasi instan — tidak perlu menunggu approval.
          </div>

          {done && <div className="banner-success">✓ Selamat! Anda kini terdaftar sebagai mitra mover. Mengarahkan ke dashboard...</div>}
          {err && <div className="alert alert-error">{err}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label-modern">Jenis kendaraan yang Anda miliki</label>
              <div className="help-modern" style={{ marginBottom: '0.6rem' }}>
                Bisa pilih lebih dari satu — order akan otomatis difilter sesuai kendaraan.
              </div>
              {VEHICLES.map((v) => (
                <label
                  key={v.code}
                  className={`checkbox-card${vehicles.includes(v.code) ? ' is-on' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={vehicles.includes(v.code)}
                    onChange={() => toggle(v.code)}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{v.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{v.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="label-modern">Area layanan (opsional)</label>
              <input
                className="input-modern"
                type="text"
                placeholder="Contoh: Jakarta Selatan, Tangerang, Bekasi"
                value={serviceArea}
                onChange={(e) => setArea(e.target.value)}
                maxLength={200}
              />
              <div className="help-modern">Kota / wilayah utama tempat Anda beroperasi</div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label-modern">Tentang Anda (opsional)</label>
              <textarea
                className="input-modern"
                rows={3}
                maxLength={500}
                placeholder="Pengalaman, keunggulan, atau hal yang ingin disampaikan ke calon pelanggan."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <button className="btn-modern is-brand" type="submit" disabled={submitting || done}>
              {submitting ? 'Mengaktifkan...' : 'Aktifkan akun mover'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
