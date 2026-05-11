import { useEffect, useState } from 'react';
import api from '../services/api';
import Icon from '../components/Icon';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const CATEGORY_LABEL = {
  order_payment:    { label: 'Pembayaran order', color: 'var(--err)' },
  order_refund:     { label: 'Refund order',     color: 'var(--ok)' },
  complaint_refund: { label: 'Refund komplain',  color: 'var(--ok)' },
  withdrawal_debit: { label: 'Penarikan dana',   color: 'var(--err)' },
  topup:            { label: 'Top up',           color: 'var(--ok)' },
};

const BANKS = [
  { code: 'BCA',    label: 'BCA' },
  { code: 'BNI',    label: 'BNI' },
  { code: 'BRI',    label: 'BRI' },
  { code: 'MANDIRI',label: 'Mandiri' },
  { code: 'CIMB',   label: 'CIMB Niaga' },
  { code: 'BSI',    label: 'BSI' },
  { code: 'GOPAY',  label: 'GoPay' },
  { code: 'OVO',    label: 'OVO' },
  { code: 'DANA',   label: 'DANA' },
  { code: 'SHOPEEPAY', label: 'ShopeePay' },
];

const E_WALLETS = ['GOPAY', 'OVO', 'DANA', 'SHOPEEPAY'];

const fmt = (d) => d
  ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [wdForm, setWdForm] = useState({
    amount: '',
    destination_type: 'bank_transfer',
    destination_name: '',
    destination_number: '',
    bank_code: '',
  });
  const [wdErr, setWdErr] = useState('');
  const [wdSuccess, setWdSuccess] = useState('');
  const [wdLoading, setWdLoading] = useState(false);

  const fetchWallet = async () => {
    try {
      const { data } = await api.get('/api/wallet');
      setWallet(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWdErr(''); setWdSuccess('');
    const amount = parseInt(wdForm.amount);
    if (!amount || amount < 10000) return setWdErr('Minimum penarikan Rp 10.000');
    if (!wdForm.destination_name.trim()) return setWdErr('Nama rekening/akun wajib diisi');
    if (!wdForm.destination_number.trim()) return setWdErr('Nomor rekening/akun wajib diisi');
    if (!wdForm.bank_code) return setWdErr('Pilih bank atau dompet digital tujuan');

    setWdLoading(true);
    try {
      const { data } = await api.post('/api/wallet/withdraw', {
        amount,
        destination_type:   wdForm.destination_type,
        destination_name:   wdForm.destination_name.trim(),
        destination_number: wdForm.destination_number.trim(),
        bank_code:          wdForm.bank_code,
      });
      setWdSuccess(data.message);
      setWdForm({ amount: '', destination_type: 'bank_transfer', destination_name: '', destination_number: '', bank_code: '' });
      setShowWithdraw(false);
      await fetchWallet();
    } catch (err) {
      setWdErr(err.response?.data?.error || 'Penarikan gagal');
    } finally {
      setWdLoading(false);
    }
  };

  if (loading) return <div className="mk-loading"><div className="mk-spinner" /></div>;

  const balance    = parseInt(wallet?.balance || 0);
  const txList     = wallet?.transactions || [];
  const pendingWd  = wallet?.pending_withdrawals || [];

  const isEWallet = E_WALLETS.includes(wdForm.bank_code);

  return (
    <div className="mk-page">
      {/* Header */}
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink-mute)', fontWeight: 500 }}>Keuangan</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-.02em' }}>
          Saldo Digital
        </h1>
      </div>

      {/* Balance card */}
      <div style={{
        background: 'var(--brand)', color: '#fff',
        borderRadius: 'var(--r-lg)', padding: '24px 24px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ opacity: .15, position: 'absolute', top: -30, right: -30, fontSize: 140, lineHeight: 1 }}>◎</div>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: .85, marginBottom: 6 }}>Saldo tersedia</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 900, letterSpacing: '-.02em' }}>
          {rp(balance)}
        </div>
        <div style={{ fontSize: 12, opacity: .7, marginTop: 6 }}>Otomatis terisi dari refund & penyelesaian komplain</div>
        <button
          className="mk-btn"
          style={{
            marginTop: 18, background: 'rgba(255,255,255,.2)', color: '#fff',
            border: '1.5px solid rgba(255,255,255,.4)', fontWeight: 700, fontSize: 13,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => { setShowWithdraw(true); setWdErr(''); setWdSuccess(''); }}
          disabled={balance < 10000}
        >
          <Icon name="arrow-up-right" size={15} /> Tarik Dana
        </button>
      </div>

      {wdSuccess && (
        <div className="mk-alert" style={{ background: 'var(--ok-soft)', border: '1px solid var(--ok)', borderRadius: 'var(--r-md)', padding: '12px 16px', display: 'flex', gap: 10 }}>
          <Icon name="check-circle" size={16} style={{ color: 'var(--ok)', flexShrink: 0 }} />
          <span style={{ fontSize: 13 }}>{wdSuccess}</span>
        </div>
      )}

      {/* Withdraw form */}
      {showWithdraw && (
        <div className="mk-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, fontFamily: 'var(--font-display)' }}>Tarik Dana</div>
          {wdErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 12, fontSize: 13 }}>{wdErr}</div>}
          <form onSubmit={handleWithdraw}>
            <div style={{ marginBottom: 12 }}>
              <label className="mk-label">Jumlah Penarikan</label>
              <input className="mk-input" type="number" min="10000" max={balance}
                placeholder="Minimum Rp 10.000"
                value={wdForm.amount}
                onChange={(e) => setWdForm({ ...wdForm, amount: e.target.value })} />
              <div className="mk-help">Saldo tersedia: {rp(balance)}</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="mk-label">Tujuan Transfer</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'bank_transfer', label: 'Rekening Bank' },
                  { value: 'e_wallet',      label: 'Dompet Digital' },
                ].map((opt) => (
                  <button
                    key={opt.value} type="button"
                    onClick={() => setWdForm({ ...wdForm, destination_type: opt.value, bank_code: '' })}
                    style={{
                      flex: 1, padding: '8px 10px', fontSize: 13, borderRadius: 'var(--r-sm)',
                      border: `1.5px solid ${wdForm.destination_type === opt.value ? 'var(--brand)' : 'var(--line-strong)'}`,
                      background: wdForm.destination_type === opt.value ? 'var(--brand-soft)' : 'var(--surface)',
                      color: wdForm.destination_type === opt.value ? 'var(--brand-ink)' : 'var(--ink)',
                      fontWeight: wdForm.destination_type === opt.value ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="mk-label">
                {wdForm.destination_type === 'bank_transfer' ? 'Bank' : 'Dompet Digital'}
              </label>
              <select className="mk-input" value={wdForm.bank_code}
                onChange={(e) => setWdForm({ ...wdForm, bank_code: e.target.value })}
                required>
                <option value="">Pilih...</option>
                {BANKS.filter((b) =>
                  wdForm.destination_type === 'e_wallet'
                    ? E_WALLETS.includes(b.code)
                    : !E_WALLETS.includes(b.code)
                ).map((b) => (
                  <option key={b.code} value={b.code}>{b.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="mk-label">
                {isEWallet ? 'Nomor Telepon Terdaftar' : 'Nomor Rekening'}
              </label>
              <input className="mk-input" type="text"
                placeholder={isEWallet ? 'Contoh: 081234567890' : 'Contoh: 1234567890'}
                value={wdForm.destination_number}
                onChange={(e) => setWdForm({ ...wdForm, destination_number: e.target.value.replace(/\D/g,'') })}
                maxLength={20} required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="mk-label">
                {isEWallet ? 'Nama Pemilik Akun' : 'Nama Pemilik Rekening'}
              </label>
              <input className="mk-input" type="text"
                placeholder="Nama sesuai rekening"
                value={wdForm.destination_name}
                onChange={(e) => setWdForm({ ...wdForm, destination_name: e.target.value })}
                maxLength={100} required />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="mk-btn mk-btn-primary" type="submit" disabled={wdLoading}>
                {wdLoading ? 'Memproses...' : <><Icon name="arrow-up-right" size={15} /> Ajukan Penarikan</>}
              </button>
              <button className="mk-btn mk-btn-ghost" type="button" onClick={() => setShowWithdraw(false)}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending withdrawals */}
      {pendingWd.length > 0 && (
        <div className="mk-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-mute)', marginBottom: 10 }}>Penarikan Diproses</div>
          {pendingWd.map((w) => (
            <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{w.destination_name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{w.bank_code} · {w.destination_number}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>{fmt(w.created_at)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--err)', fontSize: 14 }}>-{rp(w.amount)}</div>
                <span className="mk-pill mk-pill-warn" style={{ fontSize: 11 }}>
                  {w.status === 'pending' ? 'Menunggu' : 'Diproses'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction history */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, fontFamily: 'var(--font-display)' }}>
          Riwayat Transaksi
        </div>
        {txList.length === 0 ? (
          <div className="mk-empty">
            <div className="mk-empty-icon"><Icon name="clock" size={44} /></div>
            <div className="mk-empty-title">Belum ada transaksi</div>
            <div className="mk-empty-sub">Refund dan pengembalian dana akan muncul di sini.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {txList.map((tx) => {
              const meta  = CATEGORY_LABEL[tx.category] || { label: tx.category, color: 'var(--ink-mute)' };
              const isIn  = tx.type === 'credit';
              return (
                <div key={tx.id} className="mk-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isIn ? 'var(--ok-soft)' : 'rgba(239,68,68,.08)',
                      color: isIn ? 'var(--ok)' : 'var(--err)',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      <Icon name={isIn ? 'arrow-down-left' : 'arrow-up-right'} size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{meta.label}</div>
                      {tx.description && (
                        <div className="mk-truncate" style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 1 }}>{tx.description}</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 2 }}>{fmt(tx.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: isIn ? 'var(--ok)' : 'var(--err)', flexShrink: 0 }}>
                    {isIn ? '+' : '-'}{rp(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
