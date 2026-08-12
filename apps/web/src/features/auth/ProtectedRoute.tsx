import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { AuthLoadingScreen } from './AuthLoadingScreen';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'AUTH_LOADING') {
    return <AuthLoadingScreen />;
  }

  if (status === 'UNAUTHENTICATED') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'AUTH_LOADING') {
    return <AuthLoadingScreen />;
  }

  if (status === 'AUTHENTICATED') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
