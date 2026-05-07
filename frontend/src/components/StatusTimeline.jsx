const STATUS_MAP = {
  pending_payment:    { cls: 'mk-pill mk-pill-warn', label: 'Menunggu Pembayaran' },
  finding_agent:      { cls: 'mk-pill mk-pill-info', label: 'Mencari Agent' },
  assigned:           { cls: 'mk-pill mk-pill-info', label: 'Sudah Ditugaskan' },
  result_submitted:   { cls: 'mk-pill mk-pill-warn', label: 'Hasil Survei Siap' },
  completed:          { cls: 'mk-pill mk-pill-ok',   label: 'Selesai' },
  refunded:           { cls: 'mk-pill',              label: 'Dana Dikembalikan' },
  cancelled:          { cls: 'mk-pill mk-pill-err',  label: 'Dibatalkan' },
  DRAFT:              { cls: 'mk-pill',              label: 'Draf' },
  SUBMITTED:          { cls: 'mk-pill mk-pill-info', label: 'Terkirim' },
  PENDING_PAYMENT:    { cls: 'mk-pill mk-pill-warn', label: 'Menunggu Pembayaran' },
  INSTANT_CONFIRMED:  { cls: 'mk-pill mk-pill-info', label: 'Menunggu Mover' },
  REVIEW_REQUIRED:    { cls: 'mk-pill mk-pill-warn', label: 'Menunggu Review' },
  ACCEPTED:           { cls: 'mk-pill mk-pill-info', label: 'Mover Ditugaskan' },
  ON_GOING:           { cls: 'mk-pill mk-pill-info', label: 'Sedang Pindahan' },
  COMPLETED:          { cls: 'mk-pill mk-pill-ok',   label: 'Selesai' },
  INVALID:            { cls: 'mk-pill mk-pill-err',  label: 'Tidak Valid' },
  CANCELLED:          { cls: 'mk-pill mk-pill-err',  label: 'Dibatalkan' },
};

const fmt = (ts) =>
  new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function StatusTimeline({ history }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="mk-timeline">
      {history.map((item) => {
        const statusValue = item.to_status || item.status || '';
        const cfg = STATUS_MAP[statusValue] || { cls: 'mk-pill', label: statusValue.replace(/_/g, ' ') };
        return (
          <div key={item.id} className="mk-timeline-item">
            <div className="mk-timeline-status">
              <span className={cfg.cls} style={{ fontSize: 11 }}>{cfg.label}</span>
            </div>
            {item.note && <div className="mk-timeline-note">{item.note}</div>}
            <div className="mk-timeline-date">oleh {item.changed_by_name} &middot; {fmt(item.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}
