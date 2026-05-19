import { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Icon from './Icon';
import NotificationBell from './NotificationBell';

// Nav item definitions per workspace
export const USER_NAV = [
  { id: 'home',    icon: 'home',      label: 'Beranda',     href: '/dashboard' },
  { id: 'survey',  icon: 'clipboard', label: 'Survei',      href: '/dashboard?tab=survey' },
  { id: 'moving',  icon: 'truck',     label: 'Pindahan',    href: '/dashboard?tab=moving' },
  { id: 'wallet',  icon: 'wallet',    label: 'Saldo',       href: '/wallet' },
  { id: 'profile', icon: 'user',      label: 'Profil',      href: '/profile' },
];

export const AGENT_NAV = [
  { id: 'home',    icon: 'list',      label: 'Order Tersedia', href: '/dashboard' },
  { id: 'my',      icon: 'clipboard', label: 'Pekerjaan Saya', href: '/dashboard?tab=my' },
  { id: 'earn',    icon: 'wallet',    label: 'Komisi',          href: '/dashboard?tab=earn' },
  { id: 'profile', icon: 'user',      label: 'Profil',          href: '/profile' },
];

export const MOVER_NAV = [
  { id: 'home',    icon: 'list',      label: 'Job Tersedia',   href: '/dashboard' },
  { id: 'my',      icon: 'package',   label: 'Job Saya',        href: '/dashboard?tab=my' },
  { id: 'earn',    icon: 'wallet',    label: 'Penghasilan',     href: '/dashboard?tab=earn' },
  { id: 'profile', icon: 'user',      label: 'Profil',          href: '/profile' },
];

const WORKSPACE_NAV = { customer: USER_NAV, surveyor: AGENT_NAV, mover: MOVER_NAV };
const WORKSPACE_LABEL = { customer: 'Cari Layanan', surveyor: 'Surveyor', mover: 'Mover' };

function getActiveWorkspace(user, capabilities) {
  const stored = localStorage.getItem('activeWorkspace');
  const active = (capabilities || []).filter((c) => c.status === 'active').map((c) => c.capability);
  const isMitra = user?.account_type && user.account_type !== 'customer';
  const allowed = isMitra ? active.filter((c) => c !== 'customer') : active;
  if (stored && allowed.includes(stored)) return stored;
  if (user?.role === 'mover' && allowed.includes('mover')) return 'mover';
  if (user?.role === 'agent' && allowed.includes('surveyor')) return 'surveyor';
  if (allowed.length >= 1) return allowed[0];
  return isMitra ? (user.account_type === 'mover' ? 'mover' : 'surveyor') : 'customer';
}

function getActiveNavId(pathname, search) {
  if (pathname !== '/dashboard') return pathname.replace('/', '');
  const tab = new URLSearchParams(search).get('tab');
  return tab || 'home';
}

// ── TopBar ────────────────────────────────────────────────────────
function TopBar({ user, workspace, onWorkspaceChange, capabilities }) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const isMitra = user?.account_type && user.account_type !== 'customer';
  const activeCaps = (capabilities || [])
    .filter((c) => c.status === 'active')
    .map((c) => c.capability)
    .filter((cap) => !isMitra || cap !== 'customer');
  const showSwitcher = activeCaps.length > 1;
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      height: 56,
      borderBottom: '1px solid var(--line)',
      background: 'var(--surface)',
      flex: '0 0 56px',
    }}>
      {/* Logo */}
      <div className="mk-row" style={{ gap: 10 }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: 'var(--r-sm)',
          background: 'var(--brand)', color: '#fff',
          display: 'grid', placeItems: 'center',
          fontWeight: 800, fontSize: 13,
          letterSpacing: '.01em',
          fontFamily: 'var(--font-display)',
        }}>
          MK
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800, fontSize: 17,
          letterSpacing: '-.02em',
        }}>
          MyKost
          <span style={{ color: 'var(--ink-mute)', fontWeight: 500, fontSize: 13, marginLeft: 8 }}>
            {WORKSPACE_LABEL[workspace] || 'Dashboard'}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="mk-row" style={{ gap: 12 }}>
        {/* Workspace switcher */}
        {showSwitcher && (
          <div className="mk-row" style={{ gap: 3, padding: 3, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
            {activeCaps.map((cap) => (
              <button
                key={cap}
                onClick={() => onWorkspaceChange(cap)}
                style={{
                  padding: '5px 11px',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 'calc(var(--r-sm) - 2px)',
                  background: workspace === cap ? 'var(--surface)' : 'transparent',
                  color: workspace === cap ? 'var(--ink)' : 'var(--ink-soft)',
                  fontWeight: 600, fontSize: 12,
                  boxShadow: workspace === cap ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.12s',
                }}
              >
                {WORKSPACE_LABEL[cap]}
              </button>
            ))}
          </div>
        )}

        {/* Notification bell */}
        <NotificationBell />

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="mk-row"
            style={{
              gap: 9,
              padding: '5px 10px 5px 5px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 28, height: 28,
              borderRadius: 'var(--r-pill)',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid', placeItems: 'center',
              fontWeight: 700, fontSize: 12,
              fontFamily: 'var(--font-display)',
            }}>
              {user?.name?.[0] || 'U'}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name?.split(' ')[0] || 'Akun'}
            </span>
            <Icon name="chevron-down" size={14} style={{ color: 'var(--ink-mute)' }} />
          </button>

          {showMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setShowMenu(false)}
              />
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
                minWidth: 180, zIndex: 100, overflow: 'hidden',
              }}>
                <Link to="/profile" onClick={() => setShowMenu(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', fontSize: 14, fontWeight: 500,
                  color: 'var(--ink)', borderBottom: '1px solid var(--line)',
                }}>
                  <Icon name="user" size={16} />
                  Profil Saya
                </Link>
                {(!user?.account_type || user.account_type === 'customer') && (
                  <Link to="/onboarding" onClick={() => setShowMenu(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', fontSize: 14, fontWeight: 500,
                    color: 'var(--ink)', borderBottom: '1px solid var(--line)',
                  }}>
                    <Icon name="zap" size={16} />
                    Menjadi Mitra
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', fontSize: 14, fontWeight: 500,
                    color: 'var(--err)', background: 'none', border: 'none',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                  }}
                >
                  <Icon name="log-out" size={16} />
                  Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ── SideNav ────────────────────────────────────────────────────────
function SideNav({ items, activeId }) {
  const navigate = useNavigate();

  return (
    <nav style={{
      width: 220,
      padding: '18px 12px',
      borderRight: '1px solid var(--line)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      flex: '0 0 220px',
    }}>
      <div style={{
        padding: '3px 10px 12px',
        fontSize: 11, fontWeight: 700,
        color: 'var(--ink-mute)',
        letterSpacing: '.08em',
        textTransform: 'uppercase',
      }}>
        Menu
      </div>

      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.href)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--r-sm)',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              background: isActive ? 'var(--brand-soft)' : 'transparent',
              color: isActive ? 'var(--brand-ink)' : 'var(--ink-soft)',
              fontWeight: isActive ? 700 : 500,
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              transition: 'background 0.12s, color 0.12s',
            }}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

// ── AppShell layout (used as React Router layout route) ─────────────
export default function AppShell() {
  const { user, capabilities, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(
    () => getActiveWorkspace(user, capabilities)
  );

  const handleWorkspaceChange = (cap) => {
    setWorkspace(cap);
    localStorage.setItem('activeWorkspace', cap);
    navigate('/dashboard');
  };

  const navItems = WORKSPACE_NAV[workspace] || USER_NAV;
  const activeId = getActiveNavId(location.pathname, location.search);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      <TopBar
        user={user}
        workspace={workspace}
        onWorkspaceChange={handleWorkspaceChange}
        capabilities={capabilities}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SideNav items={navItems} activeId={activeId} />
        <main style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Outlet context={{ workspace, setWorkspace: handleWorkspaceChange }} />
        </main>
      </div>
    </div>
  );
}
