import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import UserDashboard from './UserDashboard';
import AgentDashboard from './AgentDashboard';
import MoverDashboard from './MoverDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();
  // workspace is managed by AppShell and passed via outlet context
  const outletCtx = useOutletContext() || {};
  const workspace = outletCtx.workspace || localStorage.getItem('activeWorkspace') || 'customer';

  if (!user) return <div className="mk-spinner" />;

  if (workspace === 'mover')    return <MoverDashboard />;
  if (workspace === 'surveyor') return <AgentDashboard />;
  return <UserDashboard />;
}
