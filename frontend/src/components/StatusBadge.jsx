const STATUS_MAP = {
  // Survey
  pending_payment:  { label: 'Menunggu Pembayaran', bg: '#fef3c7', fg: '#92400e' },
  finding_agent:    { label: 'Mencari Surveyor',    bg: '#dbeafe', fg: '#1e40af' },
  assigned:         { label: 'Sedang Disurvei',     bg: '#e0e7ff', fg: '#3730a3' },
  result_submitted: { label: 'Hasil Survei Siap',   bg: '#fef9c3', fg: '#854d0e' },
  completed:        { label: 'Selesai',             bg: '#d1fae5', fg: '#065f46' },
  refunded:         { label: 'Dana Dikembalikan',   bg: '#f3f4f6', fg: '#374151' },
  cancelled:        { label: 'Dibatalkan',          bg: '#fee2e2', fg: '#991b1b' },
  // Moving
  DRAFT:            { label: 'Draft',               bg: '#f3f4f6', fg: '#374151' },
  SUBMITTED:        { label: 'Terkirim',            bg: '#dbeafe', fg: '#1e40af' },
  PENDING_PAYMENT:  { label: 'Menunggu Pembayaran', bg: '#fef3c7', fg: '#92400e' },
  INSTANT_CONFIRMED:{ label: 'Menunggu Mover',      bg: '#dbeafe', fg: '#1e40af' },
  REVIEW_REQUIRED:  { label: 'Perlu Review',        bg: '#fed7aa', fg: '#9a3412' },
  ACCEPTED:         { label: 'Mover Ditugaskan',    bg: '#e0e7ff', fg: '#3730a3' },
  ON_GOING:         { label: 'Sedang Pindahan',     bg: '#c7d2fe', fg: '#3730a3' },
  COMPLETED:        { label: 'Selesai',             bg: '#d1fae5', fg: '#065f46' },
  INVALID:          { label: 'Tidak Valid',         bg: '#fee2e2', fg: '#991b1b' },
  CANCELLED:        { label: 'Dibatalkan',          bg: '#fee2e2', fg: '#991b1b' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: '—', bg: '#e5e7eb', fg: '#374151' };
  return (
    <span
      className={`status-badge status-${status}`}
      style={{
        background: cfg.bg,
        color: cfg.fg,
        padding: '0.25rem 0.7rem',
        borderRadius: 999,
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        textTransform: 'none',
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {cfg.label}
    </span>
  );
}
