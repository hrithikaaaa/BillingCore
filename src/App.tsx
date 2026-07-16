/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import ToastContainer from './components/ToastContainer';
import { RefreshCw } from 'lucide-react';

function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div id="router-loading" class="min-h-screen bg-zinc-950 flex flex-col justify-center items-center gap-3">
        <RefreshCw class="w-8 h-8 animate-spin text-indigo-500" />
        <p class="font-display font-semibold text-zinc-500 text-sm tracking-wide">Syncing secure gateway sessions...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return user.role === 'admin' ? <AdminDashboard /> : <CustomerDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <div id="billing-platform-app" class="font-sans antialiased bg-zinc-950 text-zinc-100">
        <DashboardRouter />
        <ToastContainer />
      </div>
    </AuthProvider>
  );
}
