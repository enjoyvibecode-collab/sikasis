import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Button, Input, Card } from '../components/UI';
import { Wallet, School, User, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function RegisterSchool() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolAddress: '',
    fullName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      // 2. Create School ID (short slug)
      const schoolId = formData.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

      // 3. Create School Doc
      await setDoc(doc(db, 'schools', schoolId), {
        name: formData.schoolName,
        address: formData.schoolAddress,
        status: 'pending',
        createdAt: serverTimestamp(),
        ownerEmail: formData.email
      });

      // 4. Create User Profile
      const isSystemOwner = formData.email === 'enjoyvibecode@gmail.com';
      
      await setDoc(doc(db, 'users', uid), {
        username: formData.email.split('@')[0],
        fullName: formData.fullName,
        role: isSystemOwner ? 'owner' : 'kepala_sekolah',
        schoolId: isSystemOwner ? 'system' : schoolId,
        status: 'active'
      });

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('Pendaftaran gagal: ' + err.message);
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

        <Card className="p-8">
          <div className="flex justify-between mb-8">
            <div className={`flex flex-col items-center gap-2 ${step === 1 ? 'text-brand-teal' : 'text-slate-400'}`}>
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${step === 1 ? 'border-brand-teal bg-teal-50' : 'border-slate-200'}`}>1</div>
              <span className="text-xs font-bold uppercase tracking-wider">Identitas Sekolah</span>
            </div>
            <div className="flex-1 border-t-2 border-dashed border-slate-200 mt-5 mx-2"></div>
            <div className={`flex flex-col items-center gap-2 ${step === 2 ? 'text-brand-teal' : 'text-slate-400'}`}>
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${step === 2 ? 'border-brand-teal bg-teal-50' : 'border-slate-200'}`}>2</div>
              <span className="text-xs font-bold uppercase tracking-wider">Akun Admin</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
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
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User size={16} /> Nama Kepala Sekolah
                  </label>
                  <Input 
                    placeholder="Nama Lengkap" 
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Mail size={16} /> Email Dinas / Pribadi
                  </label>
                  <Input 
                    type="email" 
                    placeholder="email@sekolah.sch.id" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Lock size={16} /> Buat Password
                  </label>
                  <Input 
                    type="password" 
                    placeholder="Minimal 6 karakter" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
                <div className="flex gap-4 pt-2">
                  <Button variant="secondary" type="button" onClick={() => setStep(1)} className="flex-1">
                    Kembali
                  </Button>
                  <Button type="submit" className="flex-[2]" disabled={loading}>
                    {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                  </Button>
                </div>
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
