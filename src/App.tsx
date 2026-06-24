import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Customers } from './pages/Customers';
import { EmiSales } from './pages/EmiSales';
import { Collection } from './pages/Collection';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { PublicPhones } from './pages/PublicPhones';
import { Login } from './pages/Login';
import { Reservations } from './pages/Reservations';
import { Users } from './pages/Users';
import { DailyReport } from './pages/DailyReport';
import { AiInsights } from './pages/AiInsights';
import { DiamondSecretReport } from './pages/DiamondSecretReport';
import { useStore } from './store/useStore';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  const { initFromSheets, currentUser } = useStore();

  useEffect(() => {
    initFromSheets();
  }, [initFromSheets]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/phones" element={<PublicPhones />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={
            <ProtectedRoute permission="Dashboard">
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="inventory" element={<Navigate to="/inventory/new" replace />} />
          <Route path="inventory/new" element={
            <ProtectedRoute permission="New Phone Stock">
              <ErrorBoundary><Inventory stockType="NEW" /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="inventory/used" element={
            <ProtectedRoute permission="Diamond Phone Stock">
              <ErrorBoundary><Inventory stockType="USED" /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="customers" element={
            <ProtectedRoute permission="Customer Management">
              <Customers />
            </ProtectedRoute>
          } />
          <Route path="sales" element={<Navigate to="/sales/new" replace />} />
          <Route path="sales/new" element={
            <ProtectedRoute permission="Sales">
              <EmiSales stockType="NEW" />
            </ProtectedRoute>
          } />
          <Route path="sales/used" element={
            <ProtectedRoute permission="Sales">
              <EmiSales stockType="USED" />
            </ProtectedRoute>
          } />
          <Route path="collection" element={
            <ProtectedRoute permission="Payments">
              <Collection />
            </ProtectedRoute>
          } />
          <Route path="reservations" element={
            <ProtectedRoute permission="Reservations">
              <Reservations />
            </ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute permission="User Management">
              <Users />
            </ProtectedRoute>
          } />
          <Route path="daily-report" element={
            <ProtectedRoute permission="Daily Report">
              <DailyReport />
            </ProtectedRoute>
          } />
          <Route path="reports/:type" element={
            // Note: Different report types could have different permissions, 
            // but we'll apply a generic wrapper here and let the page handle specifics if needed,
            // or just use a generic 'Reports' permission if available. 
            // The prompt says "New Phone Report", "Diamond Phone Report", "Combined Report".
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="diamond-secret-report" element={
            <ProtectedRoute permission="Diamond Secret Report">
              <DiamondSecretReport />
            </ProtectedRoute>
          } />
          <Route path="ai-insights" element={
            <ProtectedRoute permission="AI Assistant">
              <AiInsights />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute permission="Settings">
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="*" element={<div className="p-4">Not Found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
