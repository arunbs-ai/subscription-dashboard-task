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
  const { isAuthenticated, isInitializing, role } = useAppSelector((state) => state.auth);

  if (isInitializing) {
    return (
      <div className="py-24 flex items-center justify-center text-sm text-slate-400">
        Loading your session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (disallowedRole && role === disallowedRole) {
    return <Navigate to="/admin/subscriptions" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
