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
import { useStore } from './store/useStore';
import { Toaster } from 'sonner';

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
            currentUser?.role === 'InventoryManager' ? <Navigate to="/inventory" /> : 
            currentUser?.role === 'SalesOfficer' ? <Navigate to="/sales" /> : 
            <Dashboard />
          } />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />
          <Route path="sales" element={<EmiSales />} />
          <Route path="collection" element={<Collection />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="users" element={<Users />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ai-insights" element={<div className="p-4 flex flex-col items-center justify-center h-full text-center"><div className="text-4xl mb-4">✨</div><h2 className="text-xl font-bold">AI Business Forecaster</h2><p className="text-muted-foreground mt-2 max-w-md">Gemini AI is analyzing your sales velocity and predicting next month's EMI default risks. Feature pending API connection.</p></div>} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<div className="p-4">Not Found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
