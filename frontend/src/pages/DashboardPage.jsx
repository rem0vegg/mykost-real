import useAuthStore from '../store/authStore';
import UserDashboard from './UserDashboard';
import AgentDashboard from './AgentDashboard';
import MoverDashboard from './MoverDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();
  if (!user) return <div className="spinner" />;

  if (user.role === 'agent') return <AgentDashboard />;
  if (user.role === 'mover') return <MoverDashboard />;
  return <UserDashboard />;
}
