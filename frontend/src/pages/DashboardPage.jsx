import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import UserDashboard from './UserDashboard';
import AgentDashboard from './AgentDashboard';
import MoverDashboard from './MoverDashboard';

const WORKSPACE_LABEL = {
  customer: 'Cari Layanan',
  mover:    'Mover',
  surveyor: 'Surveyor',
};

const WORKSPACE_ICON = {
  customer: '🏠',
  mover:    '🚚',
  surveyor: '📋',
};

/**
 * Pilih workspace default berdasarkan:
 * 1. localStorage (user terakhir milih ini)
 * 2. legacy users.role mapping
 * 3. capability pertama selain customer
 * 4. fallback ke 'customer'
 */
function pickDefault(user, capabilities) {
  const stored = localStorage.getItem('activeWorkspace');
  const active = (capabilities || []).filter((c) => c.status === 'active').map((c) => c.capability);

  if (stored && active.includes(stored)) return stored;
  if (user?.role === 'mover' && active.includes('mover')) return 'mover';
  if (user?.role === 'agent' && active.includes('surveyor')) return 'surveyor';
  if (active.length === 1) return active[0];
  return 'customer';
}

export default function DashboardPage() {
  const { user, capabilities } = useAuthStore();
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => {
    if (user) setWorkspace(pickDefault(user, capabilities));
  }, [user, capabilities]);

  if (!user || !workspace) return <div className="spinner" />;

  const activeCaps = (capabilities || []).filter((c) => c.status === 'active').map((c) => c.capability);
  const showSwitcher = activeCaps.length > 1;

  const switchTo = (cap) => {
    setWorkspace(cap);
    localStorage.setItem('activeWorkspace', cap);
  };

  const renderActive = () => {
    if (workspace === 'mover')    return <MoverDashboard />;
    if (workspace === 'surveyor') return <AgentDashboard />;
    return <UserDashboard />;
  };

  return (
    <>
      {showSwitcher && (
        <div style={{
          background: '#fff', borderBottom: '1px solid var(--line, #e2e8f0)',
          padding: '0.65rem 1rem', display: 'flex', gap: '0.5rem',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', alignSelf: 'center', marginRight: '0.5rem' }}>
            Mode:
          </span>
          {activeCaps.map((cap) => (
            <button
              key={cap}
              onClick={() => switchTo(cap)}
              style={{
                background: workspace === cap ? '#6366f1' : '#f1f5f9',
                color:      workspace === cap ? '#fff' : '#475569',
                border: 'none',
                padding: '0.4rem 0.9rem',
                borderRadius: 999,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {WORKSPACE_ICON[cap]} {WORKSPACE_LABEL[cap]}
            </button>
          ))}
        </div>
      )}
      {renderActive()}
    </>
  );
}
