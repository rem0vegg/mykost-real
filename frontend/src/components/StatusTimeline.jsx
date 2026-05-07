import StatusBadge from './StatusBadge';

export default function StatusTimeline({ history }) {
  if (!history || history.length === 0) return null;

  const fmt = (ts) =>
    new Date(ts).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="timeline">
      {history.map((item) => {
        // Survey order pakai `status`, moving order v2 pakai `to_status`
        const statusValue = item.to_status || item.status || '';
        return (
          <div key={item.id} className="timeline-item">
            <div className="timeline-status" style={{ marginBottom: '0.25rem' }}>
              <StatusBadge status={statusValue} />
            </div>
            {item.note && <div className="timeline-note">{item.note}</div>}
            <div className="timeline-date">oleh {item.changed_by_name} &middot; {fmt(item.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}
