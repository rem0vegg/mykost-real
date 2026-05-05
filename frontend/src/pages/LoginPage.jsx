import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const set = (k, v) => { clearError(); setForm((f) => ({ ...f, [k]: v })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(form.email, form.password);
      navigate('/dashboard');
    } catch {}
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <div className="auth-title">Welcome back</div>
        <div className="auth-subtitle">Sign in to your MyKost account</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <hr className="divider" />

        <div style={{ textAlign: 'center', fontSize: '0.88rem', color: '#6b7280' }}>
          Quick test logins:
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { email: 'user@test.com', label: 'User' },
            { email: 'agent@test.com', label: 'Agent' },
            { email: 'mover@test.com', label: 'Mover' },
          ].map(({ email, label }) => (
            <button
              key={email}
              className="btn btn-outline btn-sm"
              style={{ flex: 1 }}
              onClick={() => setForm({ email, password: 'password123' })}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: '#6b7280' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#e94560', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
