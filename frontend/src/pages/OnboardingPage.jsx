import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Icon from '../components/Icon';

const MITRA_OPTIONS = [
  {
    id: 'surveyor',
    icon: 'clipboard',
    title: 'Agent / Surveyor',
    desc: 'Bantu calon penghuni mengecek kost secara langsung. Dibayar per kunjungan, jadwal fleksibel.',
    cta: 'Daftar sebagai Surveyor',
    color: 'var(--brand)',
  },
  {
    id: 'mover',
    icon: 'truck',
    title: 'Mover / Jasa Angkut',
    desc: 'Terima order pindahan sesuai kendaraan dan area layanan Anda. Penghasilan langsung per order.',
    cta: 'Daftar sebagai Mover',
    color: '#7c3aed',
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="onb-shell">
      <div className="onb-container">
        <div className="onb-eyebrow">Menjadi Mitra</div>
        <h1 className="onb-headline">
          Bergabung sebagai mitra MyKost.
        </h1>
        <p className="onb-subline">
          Pilih peran yang sesuai. Akun mitra terpisah dari akun pengguna —
          daftar akun baru khusus untuk mitra.
        </p>

        <div className="onb-grid">
          {MITRA_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="intent-card"
              onClick={() => navigate(`/mitra/register?role=${opt.id}`)}
              style={{ '--card-accent': opt.color }}
            >
              <div className="intent-card-icon" aria-hidden="true">
                <Icon name={opt.icon} size={26} stroke={1.75} />
              </div>
              <div className="intent-card-title">{opt.title}</div>
              <div className="intent-card-desc">{opt.desc}</div>
              <span className="intent-card-cta">{opt.cta}</span>
            </button>
          ))}
        </div>

        <div style={{
          marginTop: '2rem', padding: '14px 18px',
          background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
          border: '1px solid var(--line)', fontSize: 13, color: 'var(--ink-soft)',
          textAlign: 'center',
        }}>
          Pendaftaran mitra memerlukan akun baru yang terpisah dari akun pengguna Anda saat ini.
          {user && (
            <> Login sebagai mitra setelah mendaftar untuk mengelola order.</>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none', border: 'none',
              color: 'var(--ink-soft)', fontSize: '0.88rem',
              cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            ← Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
