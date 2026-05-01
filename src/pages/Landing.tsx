import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/UI';
import { Wallet, ShieldCheck, Users, TrendingUp, ArrowRight, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Landing() {
  const [allowReg, setAllowReg] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setAllowReg(snap.data().allowRegistrations ?? true);
      }
    });
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream overflow-x-hidden">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-teal rounded-xl flex items-center justify-center text-white">
            <Wallet size={24} />
          </div>
          <span className="font-display text-2xl font-bold text-brand-teal tracking-tighter">SiKasis</span>
        </div>
        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="ghost">Masuk</Button>
          </Link>
          {allowReg ? (
            <Link to="/register-school">
              <Button>Daftar Sekolah</Button>
            </Link>
          ) : (
            <div className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-sm font-bold flex items-center gap-2">
              <Lock size={14} /> Pendaftaran Ditutup
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 bg-teal-100 text-brand-teal rounded-full text-sm font-semibold mb-6">
            Solusi Keuangan Sekolah Modern
          </span>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-slate-900 leading-[1.1] mb-6">
            Kelola Tabungan Siswa <br /> 
            <span className="text-brand-teal">& Kas Kelas</span> Tanpa Ribet.
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-600 mb-10">
            Platform SaaS untuk manajemen keuangan sekolah yang transparan, aman, dan mudah digunakan oleh Kepala Sekolah, Tata Usaha, hingga Siswa.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {allowReg ? (
              <Link to="/register-school">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Mulai Gunakan SiKasis <ArrowRight size={20} />
                </Button>
              </Link>
            ) : (
              <div className="p-4 bg-slate-100 rounded-2xl text-slate-500 font-bold flex items-center justify-center gap-2 border-2 border-dashed border-slate-200">
                <Lock size={20} /> Pendaftaran Sekolah Baru Sedang Ditutup
              </div>
            )}
            <Link to="/student">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Cek Saldo Siswa
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-brand-sand py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<ShieldCheck className="text-brand-teal" size={32} />}
              title="Aman & Terpercaya"
              description="Sistem audit yang ketat untuk setiap transaksi. Keamanan data sekolah menjadi prioritas utama kami."
            />
            <FeatureCard 
              icon={<Users className="text-brand-teal" size={32} />}
              title="Multi-Role System"
              description="Akses khusus untuk Kepala Sekolah, Bendahara, Staff TU, dan Perwakilan Kelas dengan wewenang yang jelas."
            />
            <FeatureCard 
              icon={<TrendingUp className="text-brand-teal" size={32} />}
              title="Transparansi Penuh"
              description="Siswa dan orang tua dapat memantau riwayat tabungan secara mandiri hanya menggunakan NISN."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-brand-sand text-center text-slate-500 text-sm">
        <p>&copy; 2024 SiKasis. Dikembangkan dengan penuh amanah untuk pendidikan Indonesia.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
