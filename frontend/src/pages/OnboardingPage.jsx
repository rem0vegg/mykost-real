import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Icon from '../components/Icon';

const ALL_INTENTS = [
  {
    id: 'customer',
    icon: 'home',
    title: 'Mulai Gunakan Layanan',
    desc: 'Survei kost dan pindahan tanpa repot. Cari, pesan, lacak — semua dari satu tempat.',
    cta: 'Buka Dashboard',
    to: '/dashboard',
    allowedFor: ['customer', 'mover', 'surveyor'],
  },
  {
    id: 'mover',
    icon: 'truck',
    title: 'Lengkapi Profil Mover',
    desc: 'Atur kendaraan, area layanan, dan bio agar order pindahan masuk ke akun Anda.',
    cta: 'Lengkapi profil',
    to: '/apply/mover',
    allowedFor: ['mover'],
  },
  {
    id: 'surveyor',
    icon: 'clipboard',
    title: 'Lengkapi Profil Surveyor',
    desc: 'Pilih kota dan isi bio. Surveyor di kota Anda akan langsung menerima order.',
    cta: 'Lengkapi profil',
    to: '/apply/surveyor',
    allowedFor: ['surveyor'],
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, capabilities } = useAuthStore();

  const accountType = user?.account_type || 'customer';
  const hasCap = (id) => (capabilities || []).some((c) => c.capability === id && c.status === 'active');

  const visibleIntents = ALL_INTENTS.filter((i) => i.allowedFor.includes(accountType));

  return (
    <div className="onb-shell">
      <div className="onb-container">
        <div className="onb-eyebrow">Mulai sekarang</div>
        <h1 className="onb-headline">
          {user?.name ? `Halo, ${user.name.split(' ')[0]}.` : 'Selamat datang.'}
          <br />
          Apa yang ingin Anda lakukan?
        </h1>
        <p className="onb-subline">
          {accountType === 'customer'
            ? 'Akun Anda terdaftar sebagai pengguna. Gunakan layanan survei kost dan pindahan.'
            : accountType === 'mover'
            ? 'Akun mover Anda sudah aktif. Lengkapi profil untuk mulai menerima order.'
            : 'Akun surveyor Anda sudah aktif. Lengkapi profil untuk mulai menerima order.'}
        </p>

        <div className="onb-grid">
          {visibleIntents.map((intent) => {
            const active = hasCap(intent.id === 'customer' ? 'customer' : intent.id);
            return (
              <button
                key={intent.id}
                type="button"
                className={`intent-card${active ? ' is-active' : ''}`}
                onClick={() => navigate(intent.to)}
              >
                {active && <span className="intent-card-pill">Aktif</span>}
                <div className="intent-card-icon" aria-hidden="true">
                  <Icon name={intent.icon} size={26} stroke={1.75} />
                </div>
                <div className="intent-card-title">{intent.title}</div>
                <div className="intent-card-desc">{intent.desc}</div>
                <span className="intent-card-cta">{active ? 'Buka' : intent.cta}</span>
              </button>
            );
          })}
        </div>

        {accountType === 'customer' && (
          <div style={{
            marginTop: '2rem', padding: '14px 18px',
            background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
            border: '1px solid var(--line)',
            fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center',
          }}>
            Ingin menjadi mover atau surveyor?{' '}
            <strong style={{ color: 'var(--ink)' }}>Buat akun baru</strong> dan pilih peran yang sesuai saat mendaftar.
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
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
