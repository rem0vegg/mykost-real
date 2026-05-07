import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const INTENTS = [
  {
    id: 'customer',
    icon: '🏠',
    title: 'Cari Layanan',
    desc: 'Survei kost dan pindahan tanpa repot. Cari, pesan, lacak — semua dari satu tempat.',
    cta: 'Mulai cari',
    to: '/dashboard',
  },
  {
    id: 'mover',
    icon: '🚚',
    title: 'Jadi Mitra Mover',
    desc: 'Jalankan layanan pindahan Anda. Atur kendaraan, terima order, dan bangun reputasi di MyKost.',
    cta: 'Daftar jadi mitra',
    to: '/apply/mover',
  },
  {
    id: 'surveyor',
    icon: '📋',
    title: 'Jadi Surveyor',
    desc: 'Bantu calon penghuni mengecek kost secara langsung. Fleksibel, dibayar per kunjungan.',
    cta: 'Daftar jadi surveyor',
    to: '/apply/surveyor',
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, capabilities } = useAuthStore();

  const hasCap = (id) => (capabilities || []).some((c) => c.capability === id && c.status === 'active');

  return (
    <div className="onb-shell">
      <div className="onb-container">
        <div className="onb-eyebrow">Mulai sekarang</div>
        <h1 className="onb-headline">
          {user?.name ? `Halo, ${user.name.split(' ')[0]}.` : 'Selamat datang.'}
          <br />
          Apa yang Anda cari hari ini?
        </h1>
        <p className="onb-subline">
          Pilih salah satu untuk memulai. Anda bisa aktifkan kemampuan lain kapan saja
          tanpa membuat akun baru.
        </p>

        <div className="onb-grid">
          {INTENTS.map((intent) => {
            const active = hasCap(intent.id);
            return (
              <button
                key={intent.id}
                type="button"
                className={`intent-card${active ? ' is-active' : ''}`}
                onClick={() => navigate(intent.to)}
              >
                {active && <span className="intent-card-pill">Aktif</span>}
                <div className="intent-card-icon" aria-hidden="true">{intent.icon}</div>
                <div className="intent-card-title">{intent.title}</div>
                <div className="intent-card-desc">{intent.desc}</div>
                <span className="intent-card-cta">{active ? 'Buka' : intent.cta}</span>
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none', border: 'none',
              color: 'var(--ink-soft)', fontSize: '0.88rem',
              cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            Lewati untuk sekarang →
          </button>
        </div>
      </div>
    </div>
  );
}
