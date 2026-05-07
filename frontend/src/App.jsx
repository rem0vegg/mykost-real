import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AppShell from './components/AppShell';
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

export default function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) fetchMe();
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public / auth pages — no AppShell */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Onboarding & apply — protected but no AppShell sidebar */}
        <Route path="/onboarding"     element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/apply/mover"    element={<ProtectedRoute><ApplyMoverPage /></ProtectedRoute>} />
        <Route path="/apply/surveyor" element={<ProtectedRoute><ApplySurveyorPage /></ProtectedRoute>} />

        {/* Protected pages with AppShell sidebar layout */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/dashboard"            element={<DashboardPage />} />
          <Route path="/profile"              element={<ProfilePage />} />
          <Route path="/survey-orders/:id"    element={<SurveyOrderDetailPage />} />
          <Route path="/moving-orders/:id"    element={<MovingOrderDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
