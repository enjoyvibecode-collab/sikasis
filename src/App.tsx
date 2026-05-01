/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { auth } from './lib/firebase';
import Landing from './pages/Landing';
import Login from './pages/Login';
import RegisterSchool from './pages/RegisterSchool';
import Dashboard from './pages/Dashboard';
import { Wallet, Lock } from 'lucide-react';
import PublicStudentView from './pages/PublicStudentView';
import { AnimatePresence } from 'motion/react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, schoolActive, maintenanceMode } = useAuth();
  const isSuperOwner = user?.email === 'enjoyvibecode@gmail.com';

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-brand-cream">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
        <div className="text-brand-teal font-display text-xl animate-pulse">Memuat Data...</div>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  // Maintenance Mode Check (Except for Super Owner)
  if (maintenanceMode && !isSuperOwner) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-brand-cream">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} />
        </div>
        <h1 className="text-3xl font-display font-bold text-slate-800 mb-2">Sistem Sedang Maintenance</h1>
        <p className="text-slate-600 max-w-md">Mohon maaf, aplikasi SiKasis sedang dalam tahap pemeliharaan rutin. Silakan kembali beberapa saat lagi.</p>
        <button onClick={() => auth.signOut()} className="mt-8 text-brand-teal font-bold hover:underline">Keluar (Logout)</button>
      </div>
    );
  }
  
  // If user exists but profile is missing, it might be a new user or a sync error
  if (!profile) return (
    <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-brand-cream">
      <h1 className="text-2xl text-amber-600 mb-2">Profil Tidak Ditemukan</h1>
      <p className="text-slate-600 max-w-md">Akun Anda sedang disinkronkan. Jika pesan ini tidak hilang, silakan login ulang.</p>
      <button onClick={() => auth.signOut().then(() => window.location.href = '/login')} className="mt-4 px-6 py-2 bg-brand-teal text-white rounded-lg">Logout & Login Ulang</button>
    </div>
  );
  
  if (profile.role !== 'owner' && profile.role !== 'kepala_sekolah' && !schoolActive) {
    return <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-brand-cream">
      <h1 className="text-2xl text-rose-600 mb-2">Sekolah Belum Aktif</h1>
      <p className="text-slate-600 max-w-md">Akun sekolah Anda sedang menunggu persetujuan dari Owner Aplikasi.</p>
      <button onClick={() => auth.signOut().then(() => window.location.href='/login')} className="mt-4 text-brand-teal font-bold hover:underline">Keluar (Logout)</button>
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
