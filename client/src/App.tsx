import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PlansPage } from './pages/plans/PlansPage';
import { UserDashboardPage } from './pages/dashboard/UserDashboardPage';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage';
import { useAppDispatch } from './store';
import { getMeThunk } from './store/slices/authSlice';
import { TokenStorage } from './services/api';

export const App: React.FC = () => {
  const dispatch = useAppDispatch();

  // On app mount, rehydrate user session if token exists
  useEffect(() => {
    const token = TokenStorage.getAccess();
    if (token) {
      dispatch(getMeThunk());
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Default redirect */}
          <Route index element={<Navigate to="/plans" replace />} />

          {/* Public routes */}
          <Route path="plans" element={<PlansPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          {/* User protected: /dashboard (admins not allowed) */}
          <Route
            path="dashboard"
            element={
              <ProtectedRoute disallowedRole="admin">
                <UserDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin protected: /admin/subscriptions */}
          <Route
            path="admin/subscriptions"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminSubscriptionsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/plans" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
