import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';

export function Layout() {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center px-6 justify-between shrink-0">
          <h1 className="font-semibold text-lg text-foreground">Mobile EMI & Inventory System</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full">
              {currentUser.role}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
