import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import ApplyMoverPage from './pages/ApplyMoverPage';
import ApplySurveyorPage from './pages/ApplySurveyorPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SurveyOrderDetailPage from './pages/SurveyOrderDetailPage';
import MovingOrderDetailPage from './pages/MovingOrderDetailPage';

// Routes yang TIDAK menampilkan navbar (auth/onboarding/apply pages)
const HIDE_NAV_PATHS = ['/login', '/register', '/onboarding', '/apply/mover', '/apply/surveyor'];

function NavbarGate() {
  const { token } = useAuthStore();
  const location = useLocation();
  if (!token) return null;
  if (HIDE_NAV_PATHS.includes(location.pathname)) return null;
  return <Navbar />;
}

export default function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, [token]);

  return (
    <BrowserRouter>
      <NavbarGate />
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/onboarding"      element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/apply/mover"     element={<ProtectedRoute><ApplyMoverPage /></ProtectedRoute>} />
        <Route path="/apply/surveyor"  element={<ProtectedRoute><ApplySurveyorPage /></ProtectedRoute>} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/survey-orders/:id" element={<ProtectedRoute><SurveyOrderDetailPage /></ProtectedRoute>} />
        <Route path="/moving-orders/:id" element={<ProtectedRoute><MovingOrderDetailPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
