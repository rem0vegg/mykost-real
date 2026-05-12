import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="lp">
      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <span className="lp-nav__brand">MyKost</span>
        <div className="lp-nav__links">
          <Link to="/login">Masuk</Link>
          <Link to="/register" className="lp-btn lp-btn--sm">Daftar Gratis</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero__inner">
          <span className="lp-eyebrow">Survey kost &amp; jasa pindah — satu platform</span>
          <h1 className="lp-hero__h1">
            Jangan bayar kost yang<br />
            belum kamu lihat sendiri.
          </h1>
          <p className="lp-hero__sub">
            Kami kirim surveyor ke lokasi — kamu dapat laporan lengkap,
            foto asli, dan kondisi nyata <em>sebelum</em> kamu transfer DP.
            No more kejutan pas udah masuk.
          </p>
          <div className="lp-hero__cta">
            <Link to="/register" className="lp-btn lp-btn--primary">Mulai Survey Kost</Link>
            <a href="#services" className="lp-btn lp-btn--ghost">Lihat Semua Layanan</a>
          </div>
        </div>
        <div className="lp-hero__visual" aria-hidden="true">
          <div className="lp-mockup">
            <div className="lp-mockup__bar" />
            <div className="lp-mockup__card">
              <span className="lp-mockup__label">Survey selesai ✓</span>
              <span className="lp-mockup__loc">📍 Kost Melati, Depok</span>
              <div className="lp-mockup__photos">
                {[1, 2, 3].map(n => <div key={n} className="lp-mockup__photo" />)}
              </div>
              <span className="lp-mockup__status">Laporan diterima — 14 foto</span>
            </div>
            <div className="lp-mockup__card lp-mockup__card--sm">
              <span className="lp-mockup__label">Estimasi pindahan</span>
              <span className="lp-mockup__price">Rp 185.000</span>
              <span className="lp-mockup__note">Van · 12 km · door-to-door</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain points ── */}
      <section className="lp-pain">
        <div className="lp-container">
          <h2 className="lp-section-title">Tau rasanya gak?</h2>
          <p className="lp-section-sub">
            Kalau kamu pernah ngalamin salah satu ini, kamu ada di tempat yang tepat.
          </p>
          <div className="lp-pain__grid">
            {[
              { icon: '😩', text: 'Kost di foto kelihatan oke, dateng langsung — zonk.' },
              { icon: '📍', text: 'Mau survey tapi lokasi jauh dan kamu gak ada waktu.' },
              { icon: '💸', text: 'Harga pindahan tiba-tiba naik pas barang udah di truk.' },
              { icon: '📦', text: 'Gak tau barang kamu aman sampai atau enggak.' },
            ].map(({ icon, text }) => (
              <div key={text} className="lp-pain__item">
                <span className="lp-pain__icon">{icon}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-how">
        <div className="lp-container">
          <h2 className="lp-section-title">Caranya simpel banget</h2>
          <p className="lp-section-sub">Tiga langkah dan kamu beres.</p>
          <div className="lp-how__steps">
            {[
              {
                num: '01',
                title: 'Request layanan',
                desc: 'Pilih survey kost atau jasa pindah, isi detail lokasi dan kebutuhan kamu.',
              },
              {
                num: '02',
                title: 'Kami match kamu',
                desc: 'Surveyor atau mover terverifikasi langsung melihat ordermu dan siap bergerak.',
              },
              {
                num: '03',
                title: 'Done, tenang',
                desc: 'Kamu dapat laporan lengkap atau bukti foto delivery. Harga sudah fix dari awal.',
              },
            ].map(({ num, title, desc }) => (
              <div key={num} className="lp-how__step">
                <span className="lp-how__num">{num}</span>
                <h3 className="lp-how__step-title">{title}</h3>
                <p className="lp-how__step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="lp-services" id="services">
        <div className="lp-container">
          <h2 className="lp-section-title">Dua layanan, satu platform</h2>
          <p className="lp-section-sub">
            Mau cek kost dulu atau udah waktunya pindah? Kita cover dua-duanya.
          </p>
          <div className="lp-services__grid">
            <div className="lp-service-card">
              <div className="lp-service-card__icon">🔍</div>
              <h3 className="lp-service-card__title">Survey Kost</h3>
              <p className="lp-service-card__tagline">Sebelum kamu nyesel bayar DP.</p>
              <ul className="lp-service-card__list">
                <li>Surveyor kami cek kondisi kamar, fasilitas, dan area sekitar</li>
                <li>Kamu terima laporan + foto real bukan foto marketing</li>
                <li>Harga transparan mulai <strong>Rp 75.000</strong></li>
                <li>Bisa request kapan aja, dari mana aja</li>
              </ul>
              <Link to="/register" className="lp-btn lp-btn--primary lp-btn--block">
                Request Survey Sekarang
              </Link>
            </div>

            <div className="lp-service-card lp-service-card--accent">
              <div className="lp-service-card__icon">🚚</div>
              <h3 className="lp-service-card__title">Jasa Pindahan</h3>
              <p className="lp-service-card__tagline">Dari kardus ke depan pintu baru kamu.</p>
              <ul className="lp-service-card__list">
                <li>Pilih kendaraan: motor, van, atau pickup box sesuai kebutuhan</li>
                <li>Harga kalkulasi otomatis — gak ada biaya surprise di tengah jalan</li>
                <li>Bukti foto kondisi barang saat pickup <em>dan</em> delivery</li>
                <li>Add-on: door-to-door, extra helper, atau round trip</li>
              </ul>
              <Link to="/register" className="lp-btn lp-btn--primary lp-btn--block">
                Hitung Estimasi Pindahan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── For workers ── */}
      <section className="lp-worker">
        <div className="lp-container">
          <div className="lp-worker__inner">
            <div className="lp-worker__text">
              <span className="lp-eyebrow lp-eyebrow--light">Untuk surveyor &amp; mover</span>
              <h2 className="lp-worker__title">
                Punya waktu luang?<br />Jadiin penghasilan yang nyata.
              </h2>
              <p className="lp-worker__sub">
                Gak perlu tunggu klien datang sendiri. Order masuk ke dashboard kamu —
                kamu pilih yang sesuai jadwal, kamu ambil, kamu selesaikan.
              </p>
              <ul className="lp-worker__perks">
                <li>✓ Pilih order sesuai jadwalmu sendiri</li>
                <li>✓ Dashboard penghasilan real-time</li>
                <li>✓ Gak ada biaya daftar, langsung bisa kerja</li>
              </ul>
              <div className="lp-worker__cta">
                <Link to="/register" className="lp-btn lp-btn--white">Daftar Jadi Mover</Link>
                <Link to="/register" className="lp-btn lp-btn--white-outline">Daftar Jadi Surveyor</Link>
              </div>
            </div>
            <div className="lp-worker__stats">
              <div className="lp-stat">
                <span className="lp-stat__val">Rp 75rb</span>
                <span className="lp-stat__label">per survey job</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat__val">Fleksibel</span>
                <span className="lp-stat__label">jam kerja, kamu yang atur</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat__val">0%</span>
                <span className="lp-stat__label">biaya pendaftaran</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-cta">
        <div className="lp-container lp-cta__inner">
          <h2 className="lp-cta__title">Yuk, mulai sekarang.</h2>
          <p className="lp-cta__sub">
            Daftar gratis, langsung bisa request survey atau hitung estimasi pindahan.
            Gak ada yang perlu di-install.
          </p>
          <Link to="/register" className="lp-btn lp-btn--primary lp-btn--lg">
            Daftar Gratis — Sekarang
          </Link>
          <p className="lp-cta__note">
            Sudah punya akun? <Link to="/login">Masuk di sini</Link>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer__inner">
          <span className="lp-footer__brand">MyKost</span>
          <span className="lp-footer__copy">© 2025 MyKost. Platform kost &amp; pindahan Indonesia.</span>
        </div>
      </footer>
    </div>
  );
}
