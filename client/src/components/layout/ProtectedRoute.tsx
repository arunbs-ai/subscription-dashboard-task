import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { Role } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: Role;
  disallowedRole?: Role;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  disallowedRole,
}) => {
  const location = useLocation();
  const { isAuthenticated, role } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is explicitly disallowed for this route (e.g. admin cannot access /dashboard)
  if (disallowedRole && role === disallowedRole) {
    return <Navigate to="/admin/subscriptions" replace />;
  }

  // If route requires a specific role (e.g. admin for /admin/subscriptions)
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
