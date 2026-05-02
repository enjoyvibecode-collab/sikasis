import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Button, Input, Card } from '../components/UI';
import { Wallet, School, User, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const googleProvider = new GoogleAuthProvider();

export default function RegisterSchool() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolAddress: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists() && snap.data().allowRegistrations === false) {
        navigate('/');
      }
    });
    return unsub;
  }, [navigate]);

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Sign in with Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user already has a profile
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (profileSnap.exists()) {
        setError('Akun Google ini sudah terdaftar. Silakan langsung masuk.');
        setLoading(false);
        return;
      }

      // 2. Create School ID (short slug)
      const schoolId = formData.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

      // 3. Create School Doc
      await setDoc(doc(db, 'schools', schoolId), {
        name: formData.schoolName,
        address: formData.schoolAddress,
        status: 'pending',
        academicYear: '2025/2026',
        semester: 'Ganjil',
        centralBalance: 0,
        createdAt: serverTimestamp(),
        ownerEmail: user.email
      });

      // 4. Create User Profile
      const isSystemOwner = user.email === 'enjoyvibecode@gmail.com';
      
      await setDoc(doc(db, 'users', user.uid), {
        username: user.email?.split('@')[0] || 'user',
        email: user.email,
        fullName: user.displayName || 'Tanpa Nama',
        role: isSystemOwner ? 'owner' : 'kepala_sekolah',
        schoolId: isSystemOwner ? 'system' : schoolId,
        status: 'active'
      });

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Proses dibatalkan.');
      } else {
        setError('Pendaftaran gagal: ' + (err.message || err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-sand flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-10 text-center">
          <div className="w-20 h-20 bg-teal-100 text-brand-teal rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Pendaftaran Berhasil!</h1>
          <p className="text-slate-600 mb-8">
            Akun sekolah <strong>{formData.schoolName}</strong> telah berhasil dibuat. 
            Silakan tunggu persetujuan dari Owner Aplikasi sebelum dapat menggunakan fitur secara penuh.
          </p>
          <Link to="/login">
            <Button className="w-full">Ke Halaman Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-sand py-12 px-6">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-brand-teal rounded-xl flex items-center justify-center text-white">
              <Wallet size={24} />
            </div>
            <span className="font-display text-2xl font-bold text-brand-teal tracking-tighter">SiKasis</span>
          </div>
          
          <h1 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
            Bawa Digitalisasi Keuangan ke Sekolah Anda.
          </h1>
          
          <ul className="space-y-4 mb-8">
            <li className="flex gap-3 items-start">
              <div className="mt-1 w-5 h-5 bg-teal-100 text-brand-teal rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <p className="text-slate-600">Sistem multi-tenant aman & terisolasi.</p>
            </li>
            <li className="flex gap-3 items-start">
              <div className="mt-1 w-5 h-5 bg-teal-100 text-brand-teal rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <p className="text-slate-600">Manajemen tabungan & kas kelas otomatis.</p>
            </li>
            <li className="flex gap-3 items-start">
              <div className="mt-1 w-5 h-5 bg-teal-100 text-brand-teal rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={14} />
              </div>
              <p className="text-slate-600">Integrasi laporan real-time untuk audit.</p>
            </li>
          </ul>

          <div className="p-6 bg-brand-cream border border-brand-sand rounded-2xl">
            <p className="text-sm font-medium text-slate-700 italic border-l-4 border-brand-teal pl-4">
              "SiKasis membantu kami menjaga amanah uang tabungan siswa dengan lebih profesional dan transparan."
              <span className="block mt-2 font-bold not-italic">— Bendahara Sekolah</span>
            </p>
          </div>
        </div>

        <Card className="p-8 shadow-2xl border-none">
          <div className="flex justify-between mb-8">
            <div className={`flex flex-col items-center gap-2 ${step === 1 ? 'text-brand-teal' : 'text-slate-400'}`}>
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${step === 1 ? 'border-brand-teal bg-teal-50' : 'border-slate-200'}`}>1</div>
              <span className="text-xs font-bold uppercase tracking-wider">Identitas Sekolah</span>
            </div>
            <div className="flex-1 border-t-2 border-dashed border-slate-200 mt-5 mx-2"></div>
            <div className={`flex flex-col items-center gap-2 ${step === 2 ? 'text-brand-teal' : 'text-slate-400'}`}>
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${step === 2 ? 'border-brand-teal bg-teal-50' : 'border-slate-200'}`}>2</div>
              <span className="text-xs font-bold uppercase tracking-wider">Tautkan Akun</span>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {step === 1 ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <School size={16} /> Nama Sekolah
                  </label>
                  <Input 
                    placeholder="Contoh: SMPN 1 Ciwidey" 
                    value={formData.schoolName}
                    onChange={e => setFormData({...formData, schoolName: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Alamat Sekolah</label>
                  <textarea 
                    className="w-full px-4 py-2 bg-white border-2 border-brand-sand rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-teal transition-colors"
                    rows={3}
                    placeholder="Alamat lengkap sekolah..."
                    value={formData.schoolAddress}
                    onChange={e => setFormData({...formData, schoolAddress: e.target.value})}
                    required
                  />
                </div>
                <Button type="button" className="w-full" onClick={() => setStep(2)} disabled={!formData.schoolName || !formData.schoolAddress}>
                  Lanjut ke Langkah 2
                </Button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-center">
                <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl mb-4">
                  <p className="text-sm text-teal-800 font-medium">
                    Sistem kami menggunakan Google Auth untuk keamanan terbaik. Klik tombol di bawah untuk menautkan akun Kepala Sekolah.
                  </p>
                </div>
                
                <Button 
                  type="button" 
                  onClick={handleGoogleRegister} 
                  variant="outline"
                  className="w-full h-14 border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-3 bg-white shadow-sm hover:shadow transition-all text-base font-bold mb-4"
                  disabled={loading}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/>
                  </svg>
                  Tautkan Akun Google / Belajar.id
                </Button>

                <p className="text-[10px] text-slate-400 italic">
                  Pastikan Anda masuk dengan email yang akan Anda gunakan seterusnya untuk mengelola sekolah ini.
                </p>

                <Button variant="secondary" type="button" onClick={() => setStep(1)} className="w-full mt-4" disabled={loading}>
                  Kembali ke Identitas Sekolah
                </Button>
              </motion.div>
            )}
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Sudah terdaftar?{' '}
            <Link to="/login" className="text-brand-teal font-semibold hover:underline">
              Masuk di sini
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
