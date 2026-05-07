// Mapping status code -> label Indonesia + warna
const STATUS_MAP = {
  // Survey order statuses
  pending_payment:    { label: 'Menunggu Pembayaran', bg: '#fef3c7', fg: '#92400e' },
  finding_agent:      { label: 'Mencari Agent',       bg: '#dbeafe', fg: '#1e40af' },
  assigned:           { label: 'Sudah Ditugaskan',    bg: '#e0e7ff', fg: '#3730a3' },
  completed:          { label: 'Selesai',             bg: '#d1fae5', fg: '#065f46' },
  refunded:           { label: 'Dana Dikembalikan',   bg: '#f3f4f6', fg: '#374151' },
  cancelled:          { label: 'Dibatalkan',          bg: '#fee2e2', fg: '#991b1b' },

  // Moving order statuses (v2)
  DRAFT:              { label: 'Draf',                bg: '#f3f4f6', fg: '#374151' },
  SUBMITTED:          { label: 'Terkirim',            bg: '#dbeafe', fg: '#1e40af' },
  PENDING_PAYMENT:    { label: 'Menunggu Pembayaran', bg: '#fee2e2', fg: '#991b1b' },
  INSTANT_CONFIRMED:  { label: 'Menunggu Mover',      bg: '#fef3c7', fg: '#92400e' },
  REVIEW_REQUIRED:    { label: 'Menunggu Review',     bg: '#fed7aa', fg: '#9a3412' },
  ACCEPTED:           { label: 'Mover Ditugaskan',    bg: '#dbeafe', fg: '#1e40af' },
  ON_GOING:           { label: 'Sedang Pindahan',     bg: '#c7d2fe', fg: '#3730a3' },
  COMPLETED:          { label: 'Selesai',             bg: '#d1fae5', fg: '#065f46' },
  INVALID:            { label: 'Tidak Valid',         bg: '#fee2e2', fg: '#991b1b' },
  CANCELLED:          { label: 'Dibatalkan',          bg: '#fee2e2', fg: '#991b1b' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status?.replace(/_/g, ' ') || '—', bg: '#e5e7eb', fg: '#374151' };
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
