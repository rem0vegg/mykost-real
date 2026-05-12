import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="lp">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav__brand">
          <div className="lp-nav__brand-icon">MK</div>
          MyKost
        </div>
        <div className="lp-nav__links">
          <a href="#services">Layanan</a>
          <Link to="/login">Masuk</Link>
          <Link to="/register" className="lp-btn lp-btn--primary lp-btn--sm">Daftar Gratis</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        {/* Left — copy */}
        <div className="lp-hero__left">
          <div className="lp-hero__logo">
            <div className="lp-hero__logo-icon">MK</div>
            MyKost
          </div>

          <div className="lp-hero__copy">
            <span className="lp-eyebrow lp-eyebrow--light">Survey kost &amp; jasa pindahan</span>
            <h1 className="lp-hero__h1">
              Jangan bayar kost<br />
              yang belum kamu<br />
              lihat sendiri.
            </h1>
            <p className="lp-hero__sub">
              Surveyor kami cek langsung ke lokasi — kamu dapat laporan lengkap,
              foto asli, dan kondisi nyata <em>sebelum</em> transfer DP.
              No more kejutan pas udah masuk.
            </p>
            <div className="lp-hero__cta">
              <Link to="/register" className="lp-btn lp-btn--white">Mulai Survey Kost</Link>
              <a href="#services" className="lp-btn lp-btn--white-outline">Lihat Semua Layanan</a>
            </div>
          </div>

          <div>
            <div className="lp-hero__trust">
              {[
                ['🛡', 'Pembayaran aman, refund kalau surveyor tidak datang'],
                ['⭐', 'Rating mover & surveyor terverifikasi'],
                ['📊', 'Estimasi harga otomatis sebelum order'],
              ].map(([icon, text]) => (
                <div key={text} className="lp-hero__trust-item">
                  <div className="lp-hero__trust-icon">{icon}</div>
                  {text}
                </div>
              ))}
            </div>
            <p className="lp-hero__footer">© 2025 MyKost · Indonesia</p>
          </div>
        </div>

        {/* Right — mockup card */}
        <div className="lp-hero__right">
          <div className="lp-hero__card">
            <div>
              <div className="lp-hero__card-label">Survey selesai ✓</div>
              <div className="lp-hero__card-title">Kost Melati, Depok</div>
              <div className="lp-hero__card-loc">📍 Jl. Margonda Raya No. 41, Beji</div>
            </div>
            <div className="lp-hero__card-photos">
              <div className="lp-hero__card-photo" />
              <div className="lp-hero__card-photo" />
              <div className="lp-hero__card-photo" />
            </div>
            <div className="lp-hero__card-note">Laporan diterima · 14 foto oleh Andini P.</div>

            <div className="lp-hero__card-divider" />

            <div className="lp-hero__card-row">
              <div>
                <div className="lp-hero__card-label" style={{ marginBottom: 2 }}>Estimasi pindahan</div>
                <div className="lp-hero__card-price">Rp 185.000</div>
              </div>
              <div className="lp-hero__card-detail" style={{ textAlign: 'right' }}>
                Van · 12 km<br />door-to-door
              </div>
            </div>

            <Link to="/register" className="lp-btn lp-btn--primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              Mulai sekarang →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pain points ── */}
      <section className="lp-pain">
        <div className="lp-container">
          <span className="lp-eyebrow">Tau rasanya gak?</span>
          <h2 className="lp-section-title">Kalau pernah ngalamin ini,<br />kamu di tempat yang tepat.</h2>
          <div className="lp-pain__grid">
            {[
              { icon: '😩', text: 'Kost di foto kelihatan oke, dateng langsung — zonk.' },
              { icon: '📍', text: 'Mau survey tapi lokasi jauh dan kamu gak ada waktu.' },
              { icon: '💸', text: 'Harga pindahan tiba-tiba naik pas barang udah di truk.' },
              { icon: '📦', text: 'Gak tau barang kamu aman sampai atau enggak.' },
            ].map(({ icon, text }) => (
              <div key={text} className="lp-pain__item">
                <div className="lp-pain__icon">{icon}</div>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-how">
        <div className="lp-container">
          <span className="lp-eyebrow">Cara pakainya</span>
          <h2 className="lp-section-title">Tiga langkah dan kamu beres.</h2>
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
                desc: 'Surveyor atau mover terverifikasi melihat ordermu dan siap bergerak.',
              },
              {
                num: '03',
                title: 'Done, tenang',
                desc: 'Kamu dapat laporan lengkap atau bukti foto delivery. Harga fix dari awal.',
              },
            ].map(({ num, title, desc }) => (
              <div key={num} className="lp-how__step">
                <div className="lp-how__num">{num}</div>
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
          <span className="lp-eyebrow">Layanan kami</span>
          <h2 className="lp-section-title">Dua layanan, satu platform.</h2>
          <p className="lp-section-sub">
            Mau cek kost dulu atau udah waktunya pindah? Kita cover dua-duanya.
          </p>
          <div className="lp-services__grid">
            <div className="lp-service-card">
              <div className="lp-service-card__icon">🔍</div>
              <h3 className="lp-service-card__title">Survey Kost</h3>
              <p className="lp-service-card__tagline">Sebelum kamu nyesel bayar DP.</p>
              <ul className="lp-service-card__list">
                <li>Surveyor cek kondisi kamar, fasilitas, dan area sekitar</li>
                <li>Kamu terima laporan lengkap + foto real, bukan foto marketing</li>
                <li>Harga transparan — mulai dari <strong>Rp 75.000</strong></li>
                <li>Request kapan aja, dari mana aja</li>
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
                <li>Add-on: door-to-door, extra helper, round trip</li>
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
                pilih yang sesuai jadwal, ambil, selesaikan.
              </p>
              <ul className="lp-worker__perks">
                <li>Pilih order sesuai jadwalmu sendiri</li>
                <li>Dashboard penghasilan real-time</li>
                <li>Gak ada biaya daftar, langsung bisa kerja</li>
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
        <div className="lp-cta__inner">
          <span className="lp-eyebrow">Mulai sekarang</span>
          <h2 className="lp-cta__title">Yuk, coba dulu.</h2>
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
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <div className="lp-footer__brand-dot" />
            MyKost
          </div>
          <span className="lp-footer__copy">© 2025 MyKost · Platform kost &amp; pindahan Indonesia.</span>
        </div>
      </footer>
    </div>
  );
}
