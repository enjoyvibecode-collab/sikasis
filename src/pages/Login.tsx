import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Button, Input, Card } from '../components/UI';
import { Wallet, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const googleProvider = new GoogleAuthProvider();

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Gagal masuk. Periksa kembali email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      console.log('Login error code:', err.code);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup terblokir oleh browser. Harap izinkan popup untuk masuk.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User closed the window, no need for an aggressive error message
        setError('Proses masuk dibatalkan.');
      } else {
        setError(`Gagal masuk dengan Google: ${err.message || err.code || 'Terjadi kesalahan'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-sand flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-brand-teal rounded-2xl flex items-center justify-center text-white">
              <Wallet size={28} />
            </div>
            <span className="font-display text-3xl font-bold text-brand-teal tracking-tighter">SiKasis</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Masuk ke Panel</h1>
          <p className="text-slate-500">Kelola tabungan dan kas kelas dengan mudah</p>
        </div>

        <Card className="p-8">
          <div className="mb-6">
            <Button 
              onClick={handleGoogleLogin} 
              variant="outline" 
              className="w-full h-12 border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-3"
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/>
              </svg>
              Masuk dengan Google
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Atau gunakan email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Email / Username</label>
              <Input 
                type="email" 
                placeholder="email@sekolah.sch.id" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <a href="#" className="text-xs text-brand-teal hover:underline">Lupa Password?</a>
              </div>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <LogIn size={20} />
              {loading ? 'Masuk...' : 'Masuk Sekarang'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-brand-sand text-center">
            <p className="text-sm text-slate-500">
              Sekolah Anda belum terdaftar?{' '}
              <Link to="/register-school" className="text-brand-teal font-semibold hover:underline">
                Daftar Sekarang
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-brand-teal transition-colors flex items-center justify-center gap-2">
            Kembali ke Beranda
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
