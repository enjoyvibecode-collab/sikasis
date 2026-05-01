import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  School as SchoolIcon, 
  Users, 
  Wallet, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  UserCircle,
  Check,
  Clock,
  Plus,
  Send,
  ShieldCheck
} from 'lucide-react';
import { Button, Modal, Input } from '../components/UI';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, updateDoc, doc, where, getDocs, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { Card } from '../components/UI';
import type { School } from '../types';

import StaffManagement from './StaffManagement';
import StudentManagement from './StudentManagement';
import ClassManagement from './ClassManagement';
import TransactionHistory from './TransactionHistory';

const OwnerOverview = () => {
  const [stats, setStats] = React.useState({ schools: 0, pendingSchools: 0, students: 0, staff: 0 });

  React.useEffect(() => {
    const fetchData = async () => {
      const [schoolSnap, studentSnap, staffSnap] = await Promise.all([
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'users'))
      ]);
      
      const schools = schoolSnap.docs.map(d => d.data());
      
      setStats({
        schools: schoolSnap.size,
        pendingSchools: schools.filter(s => s.status === 'pending').length,
        students: studentSnap.size,
        staff: staffSnap.size
      });
    };
    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Sistem Overview</h1>
        <p className="text-slate-500">Statistik platform SiKasis secara keseluruhan.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <StatItem icon={<SchoolIcon className="text-brand-teal" />} label="Total Sekolah" value={stats.schools} color="bg-teal-50" />
        <StatItem icon={<Clock className="text-amber-600" />} label="Sekolah Pending" value={stats.pendingSchools} color="bg-amber-50" />
        <StatItem icon={<UserCircle className="text-emerald-600" />} label="Total Siswa" value={stats.students} color="bg-emerald-50" />
        <StatItem icon={<Users className="text-blue-600" />} label="Total Pengguna" value={stats.staff} color="bg-blue-50" />
      </div>

      {stats.pendingSchools > 0 && (
        <Card className="p-6 border-l-4 border-amber-500 bg-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900">Ada {stats.pendingSchools} Sekolah Menunggu Persetujuan</h3>
                <p className="text-amber-700">Segera periksa dan aktifkan akun sekolah baru.</p>
              </div>
            </div>
            <Link to="schools">
              <Button className="bg-amber-600 hover:bg-amber-700">Lihat Daftar Sekolah</Button>
            </Link>
          </div>
        </Card>
      )}

      <Card className="p-8 flex items-center justify-between bg-slate-900 text-white border-none">
        <div>
          <h3 className="text-xl font-bold">Butuh Bantuan Teknis?</h3>
          <p className="text-slate-400 mt-1">Akses dokumentasi pengembang atau hubungi support.</p>
        </div>
        <Button className="bg-white text-slate-900 hover:bg-slate-100">Buka Support</Button>
      </Card>
    </div>
  );
};

const OwnerSchools = () => {
  const [schools, setSchools] = React.useState<School[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'schools'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSchools(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as School)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const approveSchool = async (id: string) => {
    await updateDoc(doc(db, 'schools', id), { status: 'active' });
  };

  const suspendSchool = async (id: string) => {
    await updateDoc(doc(db, 'schools', id), { status: 'suspended' });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Manajemen Sekolah</h1>
        <p className="text-slate-500">Kelola lisensi dan status sekolah yang terdaftar.</p>
      </div>

      <div className="grid gap-6">
        {schools.map(school => (
          <Card key={school.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                school.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 
                school.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
              }`}>
                <SchoolIcon size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{school.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  {school.ownerEmail} • <Clock size={14} /> Registered {school.createdAt?.toDate().toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                school.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                school.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {school.status}
              </div>
              
              {(school.status === 'pending' || school.status === 'suspended') && (
                <Button onClick={() => approveSchool(school.id)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Check size={18} /> {school.status === 'pending' ? 'Approve' : 'Aktifkan'}
                </Button>
              )}
              
              {school.status === 'active' && (
                <Button variant="outline" onClick={() => suspendSchool(school.id)} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                  <X size={18} /> Suspend
                </Button>
              )}
            </div>
          </Card>
        ))}
        {!loading && schools.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <SchoolIcon size={48} className="mx-auto mb-4 text-slate-300" />
            <p>Belum ada sekolah yang mendaftar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const OwnerSettings = () => (
  <div className="p-8 max-w-2xl mx-auto text-center space-y-6">
    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
      <Settings size={40} />
    </div>
    <div>
      <h1 className="text-2xl font-bold">Pengaturan Sistem</h1>
      <p className="text-slate-500">Konfigurasi global untuk aplikasi SiKasis.</p>
    </div>
    <Card className="p-8 text-left space-y-4">
      <div className="flex items-center justify-between py-2 border-b">
        <span>Maintenance Mode</span>
        <div className="w-10 h-5 bg-slate-200 rounded-full"></div>
      </div>
      <div className="flex items-center justify-between py-2 border-b">
        <span>Allow New Registrations</span>
        <div className="w-10 h-5 bg-brand-teal rounded-full"></div>
      </div>
    </Card>
  </div>
);
const KepalaSekolahDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = React.useState({ staff: 0, students: 0, classes: 0 });

  React.useEffect(() => {
    if (!profile?.schoolId) return;
    
    // Fetch summary stats
    const fetchStats = async () => {
      const staffQ = query(collection(db, 'users'), where('schoolId', '==', profile.schoolId));
      const studentQ = query(collection(db, 'students'), where('schoolId', '==', profile.schoolId));
      const classQ = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
      
      const [staffSnap, studentSnap, classSnap] = await Promise.all([
        getDocs(staffQ), getDocs(studentQ), getDocs(classQ)
      ]);
      
      setStats({
        staff: staffSnap.size,
        students: studentSnap.size,
        classes: classSnap.size
      });
    };
    fetchStats();
  }, [profile?.schoolId]);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Halo, {profile?.fullName}</h1>
        <p className="text-slate-500 text-sm">Selamat datang di Panel Kendali Kepala Sekolah.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <StatItem icon={<Users className="text-blue-600" />} label="Total Staf" value={stats.staff} color="bg-blue-50" />
        <StatItem icon={<UserCircle className="text-emerald-600" />} label="Siswa Terdaftar" value={stats.students} color="bg-emerald-50" />
        <StatItem icon={<SchoolIcon className="text-purple-600" />} label="Total Kelas" value={stats.classes} color="bg-purple-50" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18} /> Kelola Pengguna</h3>
          <p className="text-sm text-slate-500 mb-6">Tambahkan Bendahara, TU, atau Wali Kelas untuk membantu operasional.</p>
          <Link to="staff">
            <Button className="w-full">Buka Manajemen Staf</Button>
          </Link>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><UserCircle size={18} /> Data Siswa</h3>
          <p className="text-sm text-slate-500 mb-6">Daftarkan siswa secara manual atau melalui impor file Excel massal.</p>
          <Link to="students">
            <Button className="w-full" variant="outline">Buka Manajemen Siswa</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
};

const StatItem = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) => (
  <Card className="p-4 md:p-6 border-none shadow-sm">
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
      {icon}
    </div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1">{value.toLocaleString()}</p>
  </Card>
);

const BendaharaDashboard = () => {
  const { profile } = useAuth();
  const [school, setSchool] = React.useState<any>(null);
  const [isTopUpOpen, setIsTopUpOpen] = React.useState(false);
  const [isAlokasiOpen, setIsAlokasiOpen] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [tuStaff, setTuStaff] = React.useState<any[]>([]);
  const [selectedTu, setSelectedTu] = React.useState('');

  React.useEffect(() => {
    if (!profile?.schoolId) return;
    const unsub = onSnapshot(doc(db, 'schools', profile.schoolId), (doc) => {
      setSchool(doc.data());
    });

    const tuQuery = query(
      collection(db, 'users'), 
      where('schoolId', '==', profile.schoolId),
      where('role', '==', 'tu')
    );
    getDocs(tuQuery).then(snap => {
      setTuStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return unsub;
  }, [profile?.schoolId]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) return;
    
    setLoading(true);
    try {
      const newBalance = (school?.centralBalance || 0) + val;
      await updateDoc(doc(db, 'schools', profile!.schoolId!), {
        centralBalance: newBalance
      });
      setIsTopUpOpen(false);
      setAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAlokasi = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(amount);
    if (!selectedTu || isNaN(val) || val <= 0) return;
    if (val > (school?.centralBalance || 0)) {
      alert('Saldo central tidak cukup!');
      return;
    }

    setLoading(true);
    try {
      // 1. Kurangi Saldo Central
      await updateDoc(doc(db, 'schools', profile!.schoolId!), {
        centralBalance: school.centralBalance - val
      });

      // 2. Tambah Saldo Wallet TU
      const walletRef = doc(db, 'tu_wallets', selectedTu);
      const walletSnap = await getDoc(walletRef);
      if (walletSnap.exists()) {
        await updateDoc(walletRef, {
          balance: walletSnap.data().balance + val
        });
      } else {
        await setDoc(walletRef, {
          schoolId: profile?.schoolId,
          balance: val,
          lastUpdated: new Date().toISOString()
        });
      }

      // 3. Catat Transaksi
      const txId = `tx_${Date.now()}`;
      await setDoc(doc(db, 'transactions', txId), {
        schoolId: profile?.schoolId,
        type: 'MODAL_TU_MASUK',
        amount: val,
        executorId: profile?.id || auth.currentUser?.uid,
        targetId: selectedTu,
        timestamp: new Date().toISOString(),
        status: 'completed'
      });

      setIsAlokasiOpen(false);
      setAmount('');
      alert('Alokasi modal berhasil!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 text-center max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet size={40} />
        </div>
        <h1 className="text-3xl font-bold">Kas Utama Sekolah</h1>
        <p className="text-slate-500">Saldo yang dipegang oleh Bendahara Pusat</p>
      </div>

      <Card className="p-10 bg-brand-teal text-white border-none shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
        <p className="relative text-teal-100 text-sm font-bold uppercase tracking-widest">Total Saldo Central</p>
        <h2 className="relative text-5xl font-display font-bold mt-4">
          Rp {school?.centralBalance?.toLocaleString('id-ID') || '0'}
        </h2>
        <div className="relative mt-8 flex justify-center gap-4">
          <Button onClick={() => setIsTopUpOpen(true)} className="bg-white text-brand-teal hover:bg-teal-50 border-none shadow-lg">
            <Plus size={18} className="mr-2" /> Top Up Central
          </Button>
          <Button onClick={() => setIsAlokasiOpen(true)} variant="outline" className="border-white text-white hover:bg-white/10">
            <Send size={18} className="mr-2" /> Alokasi ke TU
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6">
          <h4 className="font-bold mb-2">Riwayat Kas</h4>
          <Link to="transactions">
            <Button variant="outline" className="w-full">Lihat Semua</Button>
          </Link>
        </Card>
        <Card className="p-6">
          <h4 className="font-bold mb-2">Manajemen Siswa</h4>
          <Link to="students">
            <Button variant="outline" className="w-full">Data & Akun</Button>
          </Link>
        </Card>
      </div>

      {/* Modal Top Up */}
      <Modal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} title="Top Up Saldo Central">
        <form onSubmit={handleTopUp} className="space-y-4">
          <p className="text-sm text-slate-500">Masukkan jumlah dana masuk ke kas utama sekolah (Misal: dari Yayasan atau Dana BOS).</p>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Jumlah (Rp)</label>
            <Input 
              type="number" 
              placeholder="0" 
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <Button className="w-full h-12 mt-4" disabled={loading}>
            {loading ? 'Memproses...' : 'Konfirmasi Top Up'}
          </Button>
        </form>
      </Modal>

      {/* Modal Alokasi TU */}
      <Modal isOpen={isAlokasiOpen} onClose={() => setIsAlokasiOpen(false)} title="Alokasi Modal ke TU">
        <form onSubmit={handleAlokasi} className="space-y-4">
          <p className="text-sm text-slate-500">Kirimkan uang tunai/modal kerja ke Petugas TU untuk melayani penarikan tabungan siswa.</p>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Pilih Petugas TU</label>
            <select 
              className="w-full h-11 px-4 rounded-xl border border-slate-200"
              value={selectedTu}
              onChange={e => setSelectedTu(e.target.value)}
              required
            >
              <option value="">Pilih TU...</option>
              {tuStaff.map(tu => (
                <option key={tu.id} value={tu.id}>{tu.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Jumlah Modal (Rp)</label>
            <Input 
              type="number" 
              placeholder="0" 
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <Button className="w-full h-12 mt-4" disabled={loading}>
            {loading ? 'Kirim Modal Sekarang' : 'Kirim Modal Sekarang'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
const TUDashboard = () => {
  const { profile } = useAuth();
  const [wallet, setWallet] = React.useState<any>(null);
  const [isTxOpen, setIsTxOpen] = React.useState(false);
  const [txType, setTxType] = React.useState<'TABUNGAN_SETOR' | 'TABUNGAN_TARIK' | 'KAS_KELAS_SETOR'>('TABUNGAN_SETOR');
  const [nisn, setNisn] = React.useState('');
  const [student, setStudent] = React.useState<any>(null);
  const [amount, setAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.id) return;
    const unsub = onSnapshot(doc(db, 'tu_wallets', profile.id), (doc) => {
      setWallet(doc.data());
    });
    return unsub;
  }, [profile?.id]);

  const handleLookup = async () => {
    if (!nisn) return;
    const q = query(collection(db, 'students'), where('nisn', '==', nisn), where('schoolId', '==', profile?.schoolId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setStudent({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } else {
      alert('Siswa tidak ditemukan!');
      setStudent(null);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(amount);
    if (!student || isNaN(val) || val <= 0) return;

    if (txType === 'TABUNGAN_TARIK' && val > student.balanceSavings) {
      alert('Saldo tabungan siswa tidak cukup!');
      return;
    }
    if (txType === 'TABUNGAN_TARIK' && val > (wallet?.balance || 0)) {
       alert('Saldo di dompet TU tidak cukup untuk mencairkan!');
       return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const studentRef = doc(db, 'students', student.id);
      const walletRef = doc(db, 'tu_wallets', profile!.id!);
      const txRef = doc(collection(db, 'transactions'));

      if (txType === 'TABUNGAN_SETOR') {
        batch.update(studentRef, { balanceSavings: student.balanceSavings + val });
        batch.update(walletRef, { balance: (wallet?.balance || 0) + val });
      } else if (txType === 'TABUNGAN_TARIK') {
        batch.update(studentRef, { balanceSavings: student.balanceSavings - val });
        batch.update(walletRef, { balance: wallet.balance - val });
      }

      batch.set(txRef, {
        schoolId: profile?.schoolId,
        type: txType,
        amount: val,
        studentId: student.id,
        executorId: profile?.id,
        timestamp: new Date().toISOString(),
        status: 'completed'
      });

      await batch.commit();
      alert('Transaksi Berhasil!');
      setIsTxOpen(false);
      setAmount('');
      setNisn('');
      setStudent(null);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan servis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Panel Operasional TU</h1>
          <p className="text-slate-500">Layanan setor/tarik tabungan & kas kelas.</p>
        </div>
        <Card className="p-4 bg-slate-900 text-white border-none min-w-[200px]">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Modal di Tangan</p>
          <p className="text-xl font-display font-bold">Rp {wallet?.balance?.toLocaleString('id-ID') || '0'}</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-brand-teal to-teal-700 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <Plus size={28} />
          </div>
          <h3 className="text-xl font-bold mb-2">Setor Tabungan</h3>
          <p className="text-teal-50/70 text-sm mb-6">Terima uang tabungan dari siswa dan tambahkan ke saldo mereka.</p>
          <Button onClick={() => { setTxType('TABUNGAN_SETOR'); setIsTxOpen(true); }} className="w-full bg-white text-brand-teal hover:bg-teal-50 border-none">
            Mulai Setoran
          </Button>
        </Card>

        <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <Send size={28} />
          </div>
          <h3 className="text-xl font-bold mb-2">Tarik Tabungan</h3>
          <p className="text-blue-50/70 text-sm mb-6">Serahkan uang ke siswa dengan memotong saldo tabungan mereka.</p>
          <Button onClick={() => { setTxType('TABUNGAN_TARIK'); setIsTxOpen(true); }} className="w-full bg-white text-blue-600 hover:bg-blue-50 border-none">
            Mulai Penarikan
          </Button>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2 font-display uppercase tracking-wider text-slate-400 text-xs">
          <History size={16} /> Aktifitas Terakhir
        </h3>
        <div className="py-10 text-center text-slate-400 italic text-sm">
          Menunggu data transaksi...
        </div>
      </Card>

      {/* Modal Transaksi */}
      <Modal isOpen={isTxOpen} onClose={() => setIsTxOpen(false)} title={txType.replace(/_/g, ' ')}>
        <div className="space-y-6">
          <div className="flex gap-2">
            <Input 
              placeholder="Masukkan NISN Siswa..." 
              value={nisn}
              onChange={e => setNisn(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
            <Button variant="outline" onClick={handleLookup}>Cari</Button>
          </div>

          {student && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800">{student.fullName}</h4>
                  <p className="text-xs text-slate-500">Saldo: Rp {student.balanceSavings?.toLocaleString()}</p>
                </div>
                <div className="text-[10px] bg-brand-teal/10 text-brand-teal px-2 py-1 rounded-full font-bold">
                  TERVERIFIKASI
                </div>
              </div>
            </motion.div>
          )}

          {student && (
            <form onSubmit={handleTransaction} className="space-y-4 pt-4 border-t">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Jumlah (Rp)</label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <Button className="w-full h-12" disabled={loading}>
                {loading ? 'Sabar Ya...' : `Konfirmasi ${txType.includes('SETOR') ? 'Setoran' : 'Penarikan'}`}
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
const BendaharaKelasDashboard = () => {
  const { profile } = useAuth();
  const [classData, setClassData] = React.useState<any>(null);
  const [amount, setAmount] = React.useState('');
  const [isDepositOpen, setIsDepositOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.classId) return;
    const unsub = onSnapshot(doc(db, 'classes', profile.classId), (doc) => {
      setClassData(doc.data());
    });
    return unsub;
  }, [profile?.classId]);

  const handleCollectCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'classes', profile!.classId!), {
        balanceCash: (classData?.balanceCash || 0) + val
      });
      alert('Pemasukan Kas Kelas Dicatat!');
      setAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Wallet size={32} />
        </div>
        <h1 className="text-2xl font-bold">Kas Kelas {classData?.name}</h1>
        <p className="text-slate-500">Kelola iuran dan dana sosial kelas.</p>
      </div>

      <Card className="p-8 bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-none shadow-xl text-center">
        <p className="text-purple-100 text-xs font-bold uppercase tracking-widest">Saldo Kas Saat Ini</p>
        <h2 className="text-4xl font-display font-bold mt-2">
          Rp {classData?.balanceCash?.toLocaleString() || '0'}
        </h2>
      </Card>

      <div className="grid gap-6">
        <Card className="p-6">
          <h3 className="font-bold mb-4">Input Iuran / Kas Masuk</h3>
          <form onSubmit={handleCollectCash} className="flex gap-2">
            <Input 
              type="number" 
              placeholder="Jumlah Rp..." 
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <Button type="submit" disabled={loading}>Simpan</Button>
          </form>
        </Card>

        <Card className="p-6 border-dashed border-2 flex flex-col items-center text-center py-10">
          <History className="text-slate-300 mb-4" size={40} />
          <h4 className="font-bold">Laporan ke TU</h4>
          <p className="text-sm text-slate-500 mb-6">Setorkan iuran fisik ke TU untuk pencatatan resmi sekolah.</p>
          <Button variant="outline" onClick={() => alert('Fitur setor ke TU sedang disiapkan.')}>Setor ke TU</Button>
        </Card>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const getMenu = () => {
    switch (profile?.role) {
      case 'owner':
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Overview', path: '' },
          { icon: <SchoolIcon size={20} />, label: 'Daftar Sekolah', path: 'schools' },
          { icon: <History size={20} />, label: 'Log System', path: 'transactions' },
          { icon: <Settings size={20} />, label: 'Pengaturan Admin', path: 'settings' },
        ];
      case 'kepala_sekolah':
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Overview', path: '' },
          { icon: <SchoolIcon size={20} />, label: 'Manajemen Kelas', path: 'classes' },
          { icon: <UserCircle size={20} />, label: 'Data Siswa', path: 'students' },
          { icon: <Users size={20} />, label: 'Manajemen Staf', path: 'staff' },
          { icon: <History size={20} />, label: 'Audit Transaksi', path: 'transactions' },
        ];
      case 'bendahara':
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Kas Utama', path: '' },
          { icon: <UserCircle size={20} />, label: 'Data Siswa', path: 'students' },
          { icon: <History size={20} />, label: 'Riwayat Kas', path: 'transactions' },
        ];
      case 'tu':
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Loket TU', path: '' },
          { icon: <UserCircle size={20} />, label: 'Cari Siswa', path: 'students' },
          { icon: <History size={20} />, label: 'Riwayat Saya', path: 'transactions' },
        ];
      case 'bendahara_kelas':
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Kas Kelas', path: '' },
          { icon: <History size={20} />, label: 'Log Aktivitas', path: 'transactions' },
        ];
      default:
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '' },
        ];
    }
  };

  const menu = getMenu();

  const renderDashboardContent = () => {
    return (
      <Routes>
        <Route path="/" element={
          profile?.role === 'owner' ? <OwnerOverview /> :
          profile?.role === 'kepala_sekolah' ? <KepalaSekolahDashboard /> :
          profile?.role === 'bendahara' ? <BendaharaDashboard /> :
          profile?.role === 'tu' ? <TUDashboard /> :
          profile?.role === 'bendahara_kelas' ? <BendaharaKelasDashboard /> :
          <div className="p-8">Akses Terbatas</div>
        } />
        <Route path="schools" element={<OwnerSchools />} />
        <Route path="settings" element={<OwnerSettings />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="transactions" element={<TransactionHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  };

  return (
    <div className="min-h-screen bg-brand-cream flex">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-brand-sand z-50 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-teal rounded-lg flex items-center justify-center text-white">
                <Wallet size={18} />
              </div>
              <span className="font-display text-xl font-bold text-brand-teal tracking-tighter">SiKasis</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {menu.map((item, i) => (
              <NavLink 
                key={i} 
                icon={item.icon} 
                label={item.label} 
                path={item.path} 
                onClick={() => setSidebarOpen(false)} 
              />
            ))}
          </nav>

          <div className="pt-6 border-t border-brand-sand">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-rose-500 font-semibold hover:bg-rose-50 rounded-xl transition-colors">
              <LogOut size={20} />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-brand-sand flex items-center justify-between px-6 lg:px-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500">
            <Menu size={24} />
          </button>

          <div className="flex-1 hidden md:block">
            <h2 className="text-slate-800 font-bold">Selamat Datang, {profile?.fullName}</h2>
            <p className="text-xs text-slate-400 capitalize">{profile?.role.replace('_', ' ')} • Panel Kontrol</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{profile?.fullName}</p>
              <p className="text-[10px] text-brand-teal font-bold uppercase tracking-widest leading-none mt-1">
                {profile?.role.replace('_', ' ')}
              </p>
            </div>
            <div className="w-10 h-10 bg-brand-sand rounded-xl flex items-center justify-center text-brand-teal border border-brand-sand">
              <UserCircle size={24} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {renderDashboardContent()}
        </div>
      </main>
    </div>
  );
}

const NavLink: React.FC<{ icon: React.ReactNode, label: string, path: string, onClick: () => void }> = ({ icon, label, path, onClick }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const isDashboardRoot = path === '' || path === '.';
  
  // Construct absolute path for comparison
  const absolutePath = isDashboardRoot ? '/dashboard' : `/dashboard/${path}`;
  const isActive = currentPath === absolutePath || (currentPath === '/dashboard/' && absolutePath === '/dashboard');

  return (
    <Link 
      to={path}
      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all no-underline group ${
        isActive 
          ? 'bg-brand-teal text-white shadow-md shadow-brand-teal/20' 
          : 'hover:bg-teal-50 text-slate-600'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-teal'} transition-colors`}>{icon}</span>
        <span className={`font-semibold tracking-tight transition-colors ${isActive ? 'text-white' : 'group-hover:text-brand-teal'}`}>{label}</span>
      </div>
      {!isActive && <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-teal transition-colors" />}
    </Link>
  );
};
