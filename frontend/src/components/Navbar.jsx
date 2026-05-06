import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Navbar({ unreadCount = 0 }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">MyKost</Link>
      <div className="navbar-links">
        {user && (
          <>
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/profile">
              {user.name}
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        )}
        {!user && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
