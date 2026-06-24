import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { hasPermission } from '../utils/permissions';
import { AppPermission } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: AppPermission;
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(currentUser, permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-3xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
