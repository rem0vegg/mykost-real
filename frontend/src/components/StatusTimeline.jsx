export default function StatusTimeline({ history }) {
  if (!history || history.length === 0) return null;

  const fmt = (ts) =>
    new Date(ts).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="timeline">
      {history.map((item) => (
        <div key={item.id} className="timeline-item">
          <div className="timeline-status">{item.status.replace('_', ' ')}</div>
          {item.note && <div className="timeline-note">{item.note}</div>}
          <div className="timeline-date">by {item.changed_by_name} &middot; {fmt(item.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
