/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import RegisterSchool from './pages/RegisterSchool';
import Dashboard from './pages/Dashboard';
import PublicStudentView from './pages/PublicStudentView';
import { AnimatePresence } from 'motion/react';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const { user, profile, loading, schoolActive } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center bg-brand-cream">
    <div className="animate-pulse text-brand-teal font-display text-2xl">SiKasis...</div>
  </div>;

  if (!user) return <Navigate to="/login" />;
  
  if (profile?.role !== 'owner' && profile?.role !== 'kepala_sekolah' && !schoolActive) {
    return <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl text-rose-600 mb-2">Sekolah Belum Aktif</h1>
      <p className="text-slate-600">Akun sekolah Anda sedang menunggu persetujuan dari Owner Aplikasi.</p>
      <button onClick={() => window.location.href='/login'} className="mt-4 text-brand-teal underline">Logout</button>
    </div>;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register-school" element={<RegisterSchool />} />
            <Route path="/student/:schoolId?" element={<PublicStudentView />} />
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </AuthProvider>
  );
}
