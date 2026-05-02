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
  ShieldCheck,
  Minus,
  CalendarDays,
  GraduationCap,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { Button, Modal, Input } from '../components/UI';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  where, 
  getDocs, 
  getDoc, 
  setDoc, 
  writeBatch,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { Card } from '../components/UI';
import type { School, Student, ClassData } from '../types';
import { handleFirestoreError, OperationType, executeAtomicTransaction } from '../lib/firebase';

import StaffManagement from './StaffManagement';
import StudentManagement from './StudentManagement';
import ClassManagement from './ClassManagement';
import TransactionHistory from './TransactionHistory';
import TransactionCounter from './TransactionCounter';
import AnnouncementManagement from './AnnouncementManagement';

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
        <a href="mailto:enjoyvibecode@gmail.com">
          <Button className="bg-white text-slate-900 hover:bg-slate-100">Buka Support</Button>
        </a>
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

const OwnerSettings = () => {
  const [config, setConfig] = React.useState({ maintenanceMode: false, allowRegistrations: true });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as any);
      } else {
        // Initialize if not exists
        setDoc(doc(db, 'system', 'config'), { maintenanceMode: false, allowRegistrations: true });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const toggleSetting = async (key: string, value: boolean) => {
    try {
      await updateDoc(doc(db, 'system', 'config'), {
        [key]: !value
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Configuration...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto text-center space-y-6">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
        <Settings size={40} />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Sistem</h1>
        <p className="text-slate-500">Konfigurasi global untuk aplikasi SiKasis.</p>
      </div>
      <Card className="p-8 text-left space-y-6">
        <div className="flex items-center justify-between py-2">
          <div>
            <h4 className="font-bold text-slate-800">Maintenance Mode</h4>
            <p className="text-xs text-slate-500">Matikan akses aplikasi untuk semua staf (kecuali Owner).</p>
          </div>
          <button 
            onClick={() => toggleSetting('maintenanceMode', config.maintenanceMode)}
            className={`w-12 h-6 rounded-full transition-colors relative ${config.maintenanceMode ? 'bg-rose-500' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.maintenanceMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between py-2 border-t pt-6">
          <div>
            <h4 className="font-bold text-slate-800">Allow New Registrations</h4>
            <p className="text-xs text-slate-500">Izinkan atau blokir pendaftaran sekolah baru di halaman depan.</p>
          </div>
          <button 
            onClick={() => toggleSetting('allowRegistrations', config.allowRegistrations)}
            className={`w-12 h-6 rounded-full transition-colors relative ${config.allowRegistrations ? 'bg-brand-teal' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.allowRegistrations ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </Card>

      <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-xs flex gap-3 items-start text-left">
        <ShieldCheck size={20} className="shrink-0" />
        <p><strong>Info Safety:</strong> Perubahan pada pengaturan ini berdampak langsung pada seluruh pengguna saat ini juga. Gunakan dengan bijak.</p>
      </div>
    </div>
  );
};
const KepalaSekolahDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = React.useState({ staff: 0, students: 0, classes: 0, totalSavings: 0, totalClassCash: 0 });
  const [recentTxs, setRecentTxs] = React.useState<any[]>([]);
  const [showAnnouncements, setShowAnnouncements] = React.useState(false);
  const [school, setSchool] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.schoolId) return;
    
    // Fetch summary stats
    const staffQ = query(collection(db, 'users'), where('schoolId', '==', profile.schoolId));
    onSnapshot(doc(db, 'schools', profile.schoolId), (d) => setSchool({ id: d.id, ...d.data() }));
    const studentQ = query(collection(db, 'students'), where('schoolId', '==', profile.schoolId));
    const classQ = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    
    const unsubStaff = onSnapshot(staffQ, (snap) => {
      setStats(prev => ({ ...prev, staff: snap.size }));
    });

    const unsubStudents = onSnapshot(studentQ, (snap) => {
      const total = snap.docs.reduce((acc, d) => acc + (d.data().balanceSavings || 0), 0);
      setStats(prev => ({ ...prev, students: snap.size, totalSavings: total }));
    });

    const unsubClasses = onSnapshot(classQ, (snap) => {
      const total = snap.docs.reduce((acc, d) => acc + (d.data().balanceCash || 0), 0);
      setStats(prev => ({ ...prev, classes: snap.size, totalClassCash: total }));
    });

    // Recent Transactions
    const txQ = query(
      collection(db, 'transactions'), 
      where('schoolId', '==', profile.schoolId),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const unsubTx = onSnapshot(txQ, (snap) => {
      setRecentTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubStaff();
      unsubStudents();
      unsubClasses();
      unsubTx();
    };
  }, [profile?.schoolId]);

  if (showAnnouncements) {
    return (
      <div className="p-4 md:p-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="p-2" onClick={() => setShowAnnouncements(false)}>
            <X size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Kelola Pengumuman</h1>
        </div>
        <AnnouncementManagement />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Halo, {profile?.fullName}</h1>
          <div className="flex items-center gap-2 mt-1">
             <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest">KEPALA SEKOLAH</span>
             <p className="text-slate-500 text-sm italic">"Memimpin dengan integritas, mengelola dengan transparan."</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
          {(profile?.role === 'owner' || profile?.role === 'kepala_sekolah') && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="h-9 gap-2 font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
                onClick={async () => {
                  if (!window.confirm('PERINGATAN KERAS: Fitur ini akan menghapus SELURUH data Siswa, Kelas, dan Transaksi di sekolah ini. Saldo akan direset ke nol. Gunakan hanya untuk memulai simulasi baru dari awal. Apakah Anda yakin?')) return;
                  if (!window.confirm('KONFIRMASI KEDUA: Data yang dihapus tidak bisa dikembalikan. Lanjutkan hapus permanen?')) return;
                  
                  setLoading(true);
                  try {
                    const batch = writeBatch(db);
                    
                    // 1. Fetch and delete students
                    const studentsSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', profile!.schoolId!)));
                    studentsSnap.forEach(d => batch.delete(doc(db, 'students', d.id)));
                    
                    // 2. Fetch and delete classes
                    const classesSnap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', profile!.schoolId!)));
                    classesSnap.forEach(d => batch.delete(doc(db, 'classes', d.id)));
                    
                    // 3. Fetch and delete transactions
                    const txSnap = await getDocs(query(collection(db, 'transactions'), where('schoolId', '==', profile!.schoolId!)));
                    txSnap.forEach(d => batch.delete(doc(db, 'transactions', d.id)));
                    
                    // 4. Reset school
                    batch.update(doc(db, 'schools', profile!.schoolId!), {
                      centralBalance: 0,
                      isClosingAuthorizedByPrincipal: false,
                      academicYear: '2025/2026',
                      semester: 'Ganjil'
                    });

                    // 5. Reset TU Wallets
                    const tuWSnap = await getDocs(collection(db, 'tu_wallets'));
                    tuWSnap.forEach(d => {
                      if (d.id.startsWith(profile!.schoolId! + '_')) {
                        batch.update(doc(db, 'tu_wallets', d.id), { balance: 0 });
                      }
                    });

                    await batch.commit();
                    alert('BERHASIL: Semua data sekolah telah dibersihkan. Anda bisa memulai simulasi baru.');
                  } catch (err: any) {
                    console.error(err);
                    alert('Gagal reset: ' + err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                RESET DATA
              </Button>
              <Button 
                size="sm" 
                variant={school?.isClosingAuthorizedByPrincipal ? "default" : "outline"}
                className={`h-9 gap-2 font-bold ${school?.isClosingAuthorizedByPrincipal ? 'bg-emerald-600 border-none' : 'border-amber-200 text-amber-600'}`}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await updateDoc(doc(db, 'schools', profile!.schoolId!), {
                      isClosingAuthorizedByPrincipal: !school?.isClosingAuthorizedByPrincipal
                    });
                  } catch (err: any) {
                    console.error(err);
                    alert('Gagal memperbarui izin: ' + err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {school?.isClosingAuthorizedByPrincipal ? <Check size={16} /> : <AlertTriangle size={16} />}
                {school?.isClosingAuthorizedByPrincipal ? 'IZIN DIBERIKAN' : 'BERI IZIN TUTUP BUKU'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatItem icon={<Users size={20} className="text-blue-600" />} label="Total Staf" value={stats.staff} color="bg-blue-50" />
        <StatItem icon={<UserCircle size={20} className="text-emerald-600" />} label="Siswa" value={stats.students} color="bg-emerald-50" />
        <StatItem icon={<Wallet size={20} className="text-brand-teal" />} label="Tabungan Siswa" value={stats.totalSavings} color="bg-teal-50" isCurrency />
        <StatItem icon={<Plus size={20} className="text-purple-600" />} label="Kas Kelas" value={stats.totalClassCash} color="bg-purple-50" isCurrency />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2"><History size={18} className="text-slate-400" /> Aktifitas Finansial Terbaru</h3>
              <Link to="transactions" className="text-xs font-bold text-brand-teal hover:underline uppercase tracking-wider">Lihat Semua</Link>
            </div>
            
            <div className="space-y-4">
              {recentTxs.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] ${
                      tx.type.includes('SETOR') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {tx.type.includes('SETOR') ? <Plus size={14} /> : <Minus size={14} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{tx.entityName || tx.description || tx.type}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                        {tx.type.replace(/_/g, ' ')} • {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '...'}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${tx.type.includes('SETOR') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type.includes('SETOR') ? '+' : '-'} {(tx.amount || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
              {recentTxs.length === 0 && (
                <div className="py-10 text-center opacity-30 italic text-sm">Belum ada transaksi hari ini</div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-slate-900 text-white border-none">
            <h4 className="font-bold mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-brand-teal" /> Akses Cepat</h4>
            <div className="space-y-3">
              <Link to="staff" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">Manajemen Staf</span>
                <ChevronRight size={16} className="text-white/20" />
              </Link>
              <Link to="students" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">Data Siswa</span>
                <ChevronRight size={16} className="text-white/20" />
              </Link>
              <Link to="classes" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">Manajemen Kelas</span>
                <ChevronRight size={16} className="text-white/20" />
              </Link>
              <button 
                onClick={() => setShowAnnouncements(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-brand-teal/20 hover:bg-brand-teal/30 transition-colors group border border-brand-teal/20"
              >
                <span className="text-sm font-bold text-brand-teal group-hover:text-white">📢 Buat Pengumuman</span>
                <ChevronRight size={16} className="text-brand-teal" />
              </button>
            </div>
          </Card>
          
          <div className="p-6 bg-brand-sand/30 rounded-3xl border border-brand-sand/50">
            <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
              "Gunakan panel ini untuk mengaudit aliran dana masuk dan keluar serta mengawasi kinerja petugas sekolah."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ icon, label, value, color, isCurrency }: { icon: React.ReactNode, label: string, value: number, color: string, isCurrency?: boolean }) => (
  <Card className="p-4 md:p-6 border-none shadow-sm hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
      {icon}
    </div>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-lg md:text-2xl font-bold text-slate-800 mt-1 truncate">
      {isCurrency ? `Rp ${(value || 0).toLocaleString('id-ID')}` : (value || 0).toLocaleString('id-ID')}
    </p>
  </Card>
);

const BendaharaDashboard = () => {
  const { profile } = useAuth();
  const [school, setSchool] = React.useState<any>(null);
  const [stats, setStats] = React.useState({ totalSavings: 0, totalClassesCash: 0 });
  const [isTopUpOpen, setIsTopUpOpen] = React.useState(false);
  const [isAlokasiOpen, setIsAlokasiOpen] = React.useState(false);
  const [isTarikOpen, setIsTarikOpen] = React.useState(false);
  const [isPeriodeOpen, setIsPeriodeOpen] = React.useState(false);
  const [isSyncOpen, setIsSyncOpen] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [tuStaff, setTuStaff] = React.useState<any[]>([]);
  const [tuWallets, setTuWallets] = React.useState<any[]>([]);
  const [selectedTu, setSelectedTu] = React.useState('');
  const [selectedTuName, setSelectedTuName] = React.useState('');

  React.useEffect(() => {
    if (!profile?.schoolId) return;
    const unsub = onSnapshot(doc(db, 'schools', profile.schoolId), (doc) => {
      setSchool(doc.data());
    });

    // Fetch school financial stats
    const studentQ = query(collection(db, 'students'), where('schoolId', '==', profile.schoolId));
    const unsubStudents = onSnapshot(studentQ, (snap) => {
      const total = snap.docs.reduce((acc, d) => acc + (d.data().balanceSavings || 0), 0);
      setStats(prev => ({ ...prev, totalSavings: total }));
    });

    const classQ = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    const unsubClasses = onSnapshot(classQ, (snap) => {
      const total = snap.docs.reduce((acc, d) => acc + (d.data().balanceCash || 0), 0);
      setStats(prev => ({ ...prev, totalClassesCash: total }));
    });

    // Watch all TU wallets for closing validation
    const walletQ = query(collection(db, 'tu_wallets'), where('schoolId', '==', profile.schoolId));
    const unsubWallets = onSnapshot(walletQ, (snap) => {
      setTuWallets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const tuQuery = query(
      collection(db, 'users'), 
      where('schoolId', '==', profile.schoolId),
      where('role', '==', 'tu')
    );
    onSnapshot(tuQuery, (snap) => {
      const allTu = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const staffMap = new Map<string, any>();
      
      allTu.forEach(u => {
        const identityKey = (u.email || u.inviteEmail || u.username || u.id).toLowerCase();
        const existing = staffMap.get(identityKey);
        
        if (!existing) {
          staffMap.set(identityKey, u);
        } else {
          const existingIsPlaceholder = existing.id.startsWith('staff_');
          const currentIsPlaceholder = u.id.startsWith('staff_');
          if (existingIsPlaceholder && !currentIsPlaceholder) {
            staffMap.set(identityKey, u);
          }
        }
      });
      
      setTuStaff(Array.from(staffMap.values()));
    });

    return () => {
      unsub();
      unsubStudents();
      unsubClasses();
      unsubWallets();
    };
  }, [profile?.schoolId]);

  const totalTuBalance = tuWallets.reduce((acc, w) => acc + (w.balance || 0), 0);
  const totalLiabilities = (stats.totalSavings || 0) + (stats.totalClassesCash || 0);
  const netCashPosition = (school?.centralBalance || 0) - totalLiabilities;

  const handleSyncBalance = async () => {
    if (!window.confirm('Sinkronisasi akan menyesuaikan Saldo Central agar sama dengan Total Tabungan + Kas Kelas. Ini akan menghapus selisih saldo saat ini. Lanjutkan?')) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'schools', profile!.schoolId!), {
        centralBalance: totalLiabilities
      });
      setIsSyncOpen(false);
      alert('Sinkronisasi Sukses! Sekarang saldo kas utama sudah sama dengan total kewajiban tabungan.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTutupBuku = async () => {
    if (totalTuBalance > 0) {
      alert(`Gagal Tutup Buku! Masih ada saldo modal di tangan TU. Harap tarik semua modal ke pusat terlebih dahulu.`);
      return;
    }

    if (!school?.isClosingAuthorizedByPrincipal) {
      alert('Gagal! Penutupan buku memerlukan otorisasi (Izin) dari akun Kepala Sekolah terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const isSemesterGenap = school?.semester === 'Genap';
      
      if (isSemesterGenap) {
        // Triggers Year Promotion
        if (!window.confirm(`Anda akan menutup TAHUN AJARAN ${school?.academicYear}. \n\nSiswa Kelas 9 akan menjadi Alumni, Kelas 8 naik ke Kelas 9, dan Kelas 7 naik ke Kelas 8. \n\nLanjutkan?`)) return;
        
        const batch = writeBatch(db);
        const schoolRef = doc(db, 'schools', profile!.schoolId!);
        
        // 1. Calculate new academic year
        const currentYearStart = parseInt(school?.academicYear.split('/')[0]);
        const newYear = `${currentYearStart + 1}/${currentYearStart + 2}`;
        
        // 2. Fetch all classes to promote
        const classSnap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', profile!.schoolId!)));
        
        for (const classDoc of classSnap.docs) {
          const classData = classDoc.data();
          const className = classData.name;
          const grade = className.split(' ')[0]; // Assumes "7 A", "8 B"
          
          let newName = className;
          let newStatus = 'active';

          if (grade === '9') {
            newStatus = 'graduated'; 
          } else if (grade === '8') {
            newName = className.replace('8', '9');
          } else if (grade === '7') {
            newName = className.replace('7', '8');
          }

          batch.update(classDoc.ref, { 
            name: newName, 
            status: newStatus,
            lastPromoted: new Date().toISOString()
          });

          // Update students in this class
          const studentSnap = await getDocs(query(collection(db, 'students'), where('classId', '==', classDoc.id)));
          studentSnap.docs.forEach(sDoc => {
            batch.update(sDoc.ref, { 
              className: newName,
              status: newStatus === 'graduated' ? 'alumni' : 'active'
            });
          });
        }

        batch.update(schoolRef, {
          academicYear: newYear,
          semester: 'Ganjil',
          lastClosing: new Date().toISOString(),
          isClosingAuthorizedByPrincipal: false
        });

        await batch.commit();
        alert(`Buka Buku Sukses! Selamat datang di Tahun Ajaran ${newYear} Semester Ganjil.`);
      } else {
        // Semester Ganjil -> Semester Genap
        if (!window.confirm(`Tutup Semester Ganjil dan buka Semester Genap?`)) return;
        await updateDoc(doc(db, 'schools', profile!.schoolId!), {
          semester: 'Genap',
          lastClosing: new Date().toISOString(),
          isClosingAuthorizedByPrincipal: false
        });
        alert('Sukses! Sekarang berada di Semester Genap.');
      }
      setIsPeriodeOpen(false);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat proses tutup buku.');
    } finally {
      setLoading(false);
    }
  };

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
      await executeAtomicTransaction({
        schoolId: profile!.schoolId!,
        amount: val,
        type: 'MODAL_TU_MASUK',
        tuId: selectedTu,
        notes: `Alokasi modal tunai dari Bendahara Sekolah`
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

  const handleTarikModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(amount);
    if (!selectedTu || isNaN(val) || val <= 0) return;
    
    // Find wallet balance
    const wallet = tuWallets.find(w => w.tuId === selectedTu);
    if (!wallet || val > (wallet.balance || 0)) {
      alert('Saldo di tangan TU tidak mencukupi!');
      return;
    }

    setLoading(true);
    try {
      await executeAtomicTransaction({
        schoolId: profile!.schoolId!,
        amount: val,
        type: 'MODAL_TU_KEMBALI',
        tuId: selectedTu,
        notes: `Penarikan modal tunai dari TU (${selectedTuName}) ke Kas Utama`
      });

      setIsTarikOpen(false);
      setAmount('');
      alert('Penarikan modal berhasil!');
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
          Rp {(school?.centralBalance || 0).toLocaleString('id-ID')}
        </h2>
        <div className="relative mt-8 flex justify-center gap-4">
          <Button onClick={() => setIsTopUpOpen(true)} className="bg-white text-brand-teal hover:bg-teal-50 border-none shadow-lg px-6">
            <Plus size={18} className="mr-2" /> Inisialisasi Kas
          </Button>
          <Button onClick={() => setIsAlokasiOpen(true)} variant="outline" className="border-white text-white hover:bg-white/10 px-6">
            <Send size={18} className="mr-2" /> Alokasi ke TU
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="p-6 bg-white shadow-sm flex flex-col items-center">
          <div className="w-10 h-10 bg-teal-50 text-brand-teal rounded-xl flex items-center justify-center mb-3">
            <Wallet size={20} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Tabungan</p>
          <p className="text-lg font-bold text-slate-800 mt-1">Rp {(stats.totalSavings || 0).toLocaleString('id-ID')}</p>
        </Card>
        
        <Card className="p-6 bg-white shadow-sm flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
            <SchoolIcon size={20} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Kas Kelas</p>
          <p className="text-lg font-bold text-slate-800 mt-1">Rp {(stats.totalClassesCash || 0).toLocaleString('id-ID')}</p>
        </Card>

        <Card 
          className={`p-6 shadow-sm border-none flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all ${netCashPosition < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}
          onClick={() => netCashPosition !== 0 && setIsSyncOpen(true)}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${netCashPosition < 0 ? 'bg-rose-100' : 'bg-emerald-100'}`}>
             <ShieldCheck size={20} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status Keamanan Kas</p>
          <p className="text-sm font-bold mt-1">
            {netCashPosition < 0 ? 'DEFISIT Kas Riil' : netCashPosition > 0 ? 'SURPLUS Kas Riil' : 'Kas Aman / Sinkron'}
          </p>
          <p className="text-[11px] font-medium mt-1">
            Selisih: Rp {Math.abs(netCashPosition).toLocaleString('id-ID')}
          </p>
          {netCashPosition !== 0 && <p className="text-[9px] mt-1 underline font-bold">KLIK UNTUK SINKRON</p>}
        </Card>

        <Card className="p-6 bg-white shadow-sm flex flex-col items-center justify-center lg:col-span-1 col-span-1">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
            <CalendarDays size={20} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Periode Aktif</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{school?.academicYear || '2025/2026'}</p>
          <p className="text-[10px] font-bold text-amber-600 uppercase">SMT {school?.semester || 'GANJIL'}</p>
        </Card>

        <Card className="p-4 bg-white shadow-sm flex flex-col items-center justify-center lg:col-span-1 col-span-1">
          <Button 
            variant="outline" 
            className="w-full text-[10px] h-10 border-brand-teal text-brand-teal font-bold"
            onClick={() => setIsPeriodeOpen(true)}
          >
            TUTUP BUKU / KENAIKAN
          </Button>
          <Link to="transactions" className="w-full mt-2">
            <Button variant="ghost" className="w-full text-[10px] h-8 text-slate-400">RIWAYAT KAS</Button>
          </Link>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loket & Petugas TU</h3>
          <Link to="staff" className="text-xs text-brand-teal hover:underline font-bold">KELOLA STAF</Link>
        </div>
        <div className="grid gap-3">
          {tuStaff.map(tu => {
            const wallet = tuWallets.find(w => w.tuId === tu.id);
            const balance = wallet?.balance || 0;
            return (
              <Card key={tu.id} className="p-4 flex items-center justify-between bg-white border-brand-sand shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100">
                    <UserCircle size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{tu.fullName}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      Modal: Rp {balance.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] border-amber-200 text-amber-600 hover:bg-amber-50 font-bold"
                    onClick={() => {
                      setSelectedTu(tu.id);
                      setSelectedTuName(tu.fullName);
                      setIsTarikOpen(true);
                      setAmount('');
                    }}
                    disabled={balance <= 0}
                  >
                    TARIK
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-8 text-[10px] font-bold"
                    onClick={() => {
                      setSelectedTu(tu.id);
                      setSelectedTuName(tu.fullName);
                      setIsAlokasiOpen(true);
                      setAmount('');
                    }}
                  >
                    KIRIM
                  </Button>
                </div>
              </Card>
            );
          })}
          {tuStaff.length === 0 && (
            <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center opacity-30">
              <Users size={32} className="mb-2" />
              <p className="text-xs italic">Belum ada petugas TU.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Periode */}
      <Modal isOpen={isPeriodeOpen} onClose={() => setIsPeriodeOpen(false)} title="Manajemen Periode & Kelulusan">
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 text-white rounded-2xl">
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-brand-teal/20 text-brand-teal rounded-xl flex items-center justify-center">
                   <CalendarDays size={20} />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tahun Ajaran Aktif</p>
                   <h4 className="text-lg font-bold">{school?.academicYear || '2025/2026'}</h4>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semester</p>
                 <span className="bg-brand-teal text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {school?.semester || 'GANJIL'}
                 </span>
               </div>
            </div>
            
            <div className="h-px bg-white/10 w-full mb-4"></div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Modal di Tangan TU (Harus Nol):</p>
                {totalTuBalance > 0 && (
                  <button 
                    onClick={async () => {
                      if (!window.confirm('PERINGATAN: Sinkronisasi Paksa akan memindahkan SELURUH modal di tangan semua TU kembali ke Kas Pusat. Gunakan jika ada saldo yang nyangkut akibat penghapusan transaksi manual. Lanjutkan?')) return;
                      setLoading(true);
                      try {
                        const batch = writeBatch(db);
                        let totalRecovered = 0;
                        tuWallets.forEach(w => {
                          if (w.balance > 0) {
                            totalRecovered += w.balance;
                            batch.update(doc(db, 'tu_wallets', w.id), { 
                              balance: 0,
                              schoolId: profile!.schoolId! // Ensure rule belongsToSchool(incoming().schoolId) passes
                            });
                          }
                        });
                        
                        if (totalRecovered > 0) {
                          const schoolRef = doc(db, 'schools', profile!.schoolId!);
                          const schoolSnap = await getDoc(schoolRef);
                          const currentBal = schoolSnap.data()?.centralBalance || 0;
                          batch.update(schoolRef, { centralBalance: currentBal + totalRecovered });
                          
                          // Log the audit adjustment
                          const auditRef = doc(collection(db, 'transactions'));
                          batch.set(auditRef, {
                            id: auditRef.id,
                            schoolId: profile!.schoolId!,
                            executorId: auth.currentUser?.uid,
                            amount: totalRecovered,
                            type: 'AUDIT_ADJUSTMENT_IN',
                            description: 'Penarikan Paksa Modal TU (Audit/Tutup Buku)',
                            timestamp: serverTimestamp(),
                            status: 'success'
                          });
                        }
                        
                        await batch.commit();
                        alert('Audit Selesai! Semua modal TU telah dikembalikan ke Kas Pusat.');
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-[10px] font-bold text-brand-teal hover:underline"
                  >
                    SINKRON PAKSA KE PUSAT
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {tuWallets.map(w => {
                  if ((w.balance || 0) <= 0) return null;
                  const staff = tuStaff.find(s => s.id === w.tuId);
                  return (
                    <div key={w.id} className="p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/10">
                      <div className="text-left">
                        <span className="text-xs font-medium text-slate-300 block">{staff?.fullName || 'Staf (Dihapus/Orphan)'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {w.tuId.slice(-6)}</span>
                      </div>
                      <span className="text-xs font-bold text-rose-400">Rp {(w.balance || 0).toLocaleString('id-ID')}</span>
                    </div>
                  );
                })}
                {totalTuBalance === 0 && (
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-bold">Semua Modal TU sudah ditarik</span>
                    <Check size={16} />
                  </div>
                )}
                {totalTuBalance > 0 && (
                  <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-bold">Total: Rp {totalTuBalance.toLocaleString('id-ID')}</span>
                    <AlertTriangle size={16} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`p-4 border-2 rounded-2xl ${school?.isClosingAuthorizedByPrincipal ? 'border-emerald-100 bg-emerald-50' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${school?.isClosingAuthorizedByPrincipal ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <ShieldCheck size={18} />
                  </div>
                  <h5 className="font-bold text-slate-800">Izin Kepala Sekolah</h5>
                </div>
                {school?.isClosingAuthorizedByPrincipal ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full uppercase">Diberikan</span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase">Menunggu</span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {school?.isClosingAuthorizedByPrincipal 
                  ? 'Kepala Sekolah telah menyetujui proses penutupan periode ini.' 
                  : 'Otorisasi dari akun Kepala Sekolah diperlukan untuk memproses penutupan buku.'}
              </p>
            </div>

            <div className="p-4 border-2 border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <ArrowRight size={18} />
                </div>
                <h5 className="font-bold text-slate-800">
                  {school?.semester === 'Ganjil' ? 'Buka Semester Genap' : 'Tutup Tahun Ajaran & Kenaikan Kelas'}
                </h5>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {school?.semester === 'Ganjil' 
                  ? 'Menandai berakhirnya semester ganjil. Saldo tabungan dan kas tetap berlanjut.' 
                  : 'Siswa akan naik tingkat. Kelas 9 menjadi Alumni. Pastikan semua transaksi tahun ini sudah selesai.'}
              </p>
            </div>

            <Button 
              className="w-full h-14 text-lg gap-3" 
              disabled={loading || totalTuBalance > 0 || !school?.isClosingAuthorizedByPrincipal}
              onClick={handleTutupBuku}
            >
              {loading ? 'Sedang Memproses...' : (
                <>
                  <GraduationCap size={24} /> 
                  {school?.semester === 'Ganjil' ? 'KONFIRMASI SEMESTER BARU' : 'PROSES KENAIKAN KELAS'}
                </>
              )}
            </Button>
            
            {totalTuBalance > 0 && (
              <p className="text-[10px] text-rose-500 font-bold text-center uppercase tracking-wider">
                *Harap tarik semua modal TU ke pusat untuk melakukan penutupan buku.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Inisialisasi Kas */}
      <Modal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} title="Inisialisasi / Tambah Kas Utama">
        <form onSubmit={handleTopUp} className="space-y-4">
          <p className="text-sm text-slate-500">
            Masukkan jumlah dana tunai riil yang saat ini dipegang oleh Bendahara. Dana ini akan digunakan sebagai dasar (backing) untuk melayani tabungan siswa dan kas kelas.
          </p>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Jumlah Dana Tunai (Rp)</label>
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
            {loading ? 'Memproses...' : 'Konfirmasi Inisialisasi Kas'}
          </Button>
        </form>
      </Modal>

      {/* Modal Alokasi TU */}
      <Modal isOpen={isAlokasiOpen} onClose={() => setIsAlokasiOpen(false)} title={`Alokasi Modal: ${selectedTuName}`}>
        <form onSubmit={handleAlokasi} className="space-y-4">
          <p className="text-sm text-slate-500">Kirimkan uang tunai/modal kerja ke Petugas TU ini untuk melayani penarikan tabungan siswa.</p>
          {!selectedTu && (
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
          )}
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Jumlah Modal (Rp)</label>
            <Input 
              type="number" 
              placeholder="0" 
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
            <p className="text-[10px] text-slate-400 mt-1 italic">Saldo Central: Rp {school?.centralBalance?.toLocaleString('id-ID')}</p>
          </div>
          <Button className="w-full h-12 mt-4" disabled={loading}>
            {loading ? 'Sabar Ya...' : 'Konfirmasi Kirim Modal'}
          </Button>
        </form>
      </Modal>

      {/* Modal Sinkronisasi Saldo */}
      <Modal isOpen={isSyncOpen} onClose={() => setIsSyncOpen(false)} title="Sinkronisasi Saldo Central">
        <div className="space-y-4">
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <AlertTriangle size={40} className="text-amber-600 mx-auto mb-4" />
            <h4 className="font-bold text-amber-900 mb-1">Peringatan Audit Selisih</h4>
            <p className="text-sm text-amber-700">Ditemukan selisih antara Saldo Central (Riil) dengan Total Kewajiban (Tabungan + Kas).</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Input Riil Saat Ini</p>
              <p className="text-lg font-bold text-slate-800">Rp {school?.centralBalance?.toLocaleString('id-ID')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Harusnya (Total Kewajiban)</p>
              <p className="text-lg font-bold text-brand-teal">Rp {totalLiabilities.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed italic">
            "Jika Anda yakin saldo tabungan siswa di aplikasi sudah benar tetapi angka saldo pusat tidak sinkron (akibat data lama atau penghapusan), tekan tombol di bawah untuk menyamakan saldo pusat dengan total kewajiban."
          </p>

          <Button className="w-full h-12 bg-amber-600 hover:bg-amber-700 border-none" disabled={loading} onClick={handleSyncBalance}>
            {loading ? 'Menyeimbangkan...' : 'Samakan Saldo Pusat & Kewajiban'}
          </Button>
        </div>
      </Modal>
      <Modal isOpen={isTarikOpen} onClose={() => setIsTarikOpen(false)} title={`Tarik Modal: ${selectedTuName}`}>
        <form onSubmit={handleTarikModal} className="space-y-4">
          <p className="text-sm text-slate-500">Tarik kembali sisa uang tunai yang dipegang Petugas TU ini ke dalam Kas Utama Sekolah.</p>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Jumlah yang Ditarik (Rp)</label>
            <Input 
              type="number" 
              placeholder="0" 
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
            <p className="text-[10px] text-slate-400 mt-1 italic">
              Batas Maksimal: Rp {tuWallets.find(w => w.tuId === selectedTu)?.balance?.toLocaleString('id-ID') || '0'}
            </p>
          </div>
          <Button className="w-full h-12 mt-4 bg-amber-600 hover:bg-amber-700 border-none" disabled={loading}>
            {loading ? 'Sedang Menarik...' : 'Konfirmasi Tarik Modal'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
const TUDashboard = () => {
  const { profile } = useAuth();
  const [wallet, setWallet] = React.useState<any>(null);
  const [recentTransactions, setRecentTransactions] = React.useState<any[]>([]);
  const [isTxOpen, setIsTxOpen] = React.useState(false);
  const [txType, setTxType] = React.useState<'SETOR_TABUNGAN' | 'TARIK_TABUNGAN'>('SETOR_TABUNGAN');
  const [nisn, setNisn] = React.useState('');
  const [student, setStudent] = React.useState<any>(null);
  const [amount, setAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.id || !profile?.schoolId) return;
    const walletId = `${profile.schoolId}_${profile.id}`;
    const unsub = onSnapshot(doc(db, 'tu_wallets', walletId), (doc) => {
      setWallet(doc.data());
    });

    const txQ = query(
      collection(db, 'transactions'),
      where('executorId', '==', profile.id),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const unsubTx = onSnapshot(txQ, (snap) => {
      setRecentTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsub();
      unsubTx();
    };
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

    if (txType === 'TARIK_TABUNGAN' && val > student.balanceSavings) {
      alert('Saldo tabungan siswa tidak cukup!');
      return;
    }
    if (txType === 'TARIK_TABUNGAN' && val > (wallet?.balance || 0)) {
       alert('Saldo di dompet TU tidak cukup untuk mencairkan!');
       return;
    }

    setLoading(true);
    try {
      await executeAtomicTransaction({
        schoolId: profile?.schoolId || '',
        studentId: student.id,
        entityName: student.fullName,
        amount: val,
        type: txType,
        tuId: profile?.id,
        notes: txType === 'SETOR_TABUNGAN' ? 'Setoran via Loket TU' : 'Penarikan via Loket TU'
      });

      alert('Transaksi Berhasil!');
      setIsTxOpen(false);
      setAmount('');
      setNisn('');
      setStudent(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'TU Loket Transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold text-slate-800">Panel Operasional TU</h1>
            <span className="bg-brand-teal/10 text-brand-teal text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-teal/20 uppercase tracking-wider">
              {profile?.role?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-slate-500">Layanan setor/tarik tabungan & kas kelas.</p>
        </div>
        <Card className="p-4 bg-slate-900 text-white border-none min-w-[200px]">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Modal di Tangan</p>
          <p className="text-xl font-display font-bold">Rp {(wallet?.balance || 0).toLocaleString('id-ID')}</p>
        </Card>
      </div>

      {/* Info Wewenang */}
      <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-teal text-white rounded-xl flex items-center justify-center shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Status Wewenang Akses</p>
            <h4 className="text-sm font-bold text-slate-800">
              {profile?.authorizedGrades?.includes('Semua') 
                ? 'Akses Penuh Seluruh Tingkat' 
                : `Mengelola Tingkat: ${profile?.authorizedGrades?.join(', ')}`}
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-teal-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-600">SISTEM AKTIF</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-brand-teal to-teal-700 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <Plus size={28} />
          </div>
          <h3 className="text-xl font-bold mb-2">Setor Tabungan</h3>
          <p className="text-teal-50/70 text-sm mb-6">Terima uang tabungan dari siswa dan tambahkan ke saldo mereka.</p>
          <Button onClick={() => { setTxType('SETOR_TABUNGAN'); setIsTxOpen(true); }} className="w-full bg-white text-brand-teal hover:bg-teal-50 border-none">
            Mulai Setoran
          </Button>
        </Card>

        <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
            <Send size={28} />
          </div>
          <h3 className="text-xl font-bold mb-2">Tarik Tabungan</h3>
          <p className="text-blue-50/70 text-sm mb-6">Serahkan uang ke siswa dengan memotong saldo tabungan mereka.</p>
          <Button onClick={() => { setTxType('TARIK_TABUNGAN'); setIsTxOpen(true); }} className="w-full bg-white text-blue-600 hover:bg-blue-50 border-none">
            Mulai Penarikan
          </Button>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold flex items-center gap-2 font-display uppercase tracking-wider text-slate-400 text-xs">
            <History size={16} /> Aktifitas Terakhir Saya
          </h3>
          <Link to="transactions" className="text-[10px] font-bold text-brand-teal hover:underline tracking-widest uppercase">Lihat Log</Link>
        </div>
        
        <div className="space-y-4">
          {recentTransactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${tx.type.includes('SETOR') ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div>
                  <p className="text-sm font-bold text-slate-700">{tx.entityName || tx.studentId}</p>
                  <p className="text-[10px] text-slate-400">
                    {tx.type.replace(/_/g, ' ')} • {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '...'}
                  </p>
                </div>
              </div>
              <p className={`text-sm font-bold ${tx.type.includes('SETOR') ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.type.includes('SETOR') ? '+' : '-'} {(tx.amount || 0).toLocaleString('id-ID')}
              </p>
            </div>
          ))}
          {recentTransactions.length === 0 && (
            <div className="py-10 text-center text-slate-400 italic text-sm">
              Belum ada transaksi hari ini.
            </div>
          )}
        </div>
      </Card>

      {/* Modal Transaksi */}
      <Modal isOpen={isTxOpen} onClose={() => setIsTxOpen(false)} title={txType === 'SETOR_TABUNGAN' ? 'Setoran Tabungan Siswa' : 'Penarikan Tabungan Siswa'}>
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
                  <p className="text-xs text-slate-500">Saldo: Rp {(student.balanceSavings || 0).toLocaleString('id-ID')}</p>
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
  const [recentTxs, setRecentTxs] = React.useState<any[]>([]);
  const [amount, setAmount] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.classId) return;
    const unsub = onSnapshot(doc(db, 'classes', profile.classId), (doc) => {
      setClassData(doc.data());
    });

    const txQ = query(
      collection(db, 'transactions'),
      where('classId', '==', profile.classId),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const unsubTx = onSnapshot(txQ, (snap) => {
      setRecentTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsub();
      unsubTx();
    };
  }, [profile?.classId]);

  const handleCollectCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) return;
    setLoading(true);
    try {
      await executeAtomicTransaction({
        schoolId: profile?.schoolId || '',
        classId: profile?.classId,
        entityName: `Iuran Kas Kelas ${classData?.name}`,
        amount: val,
        type: 'SETOR_KAS_KELAS',
        notes: 'Pemasukan Kas Kelas Manual'
      });
      alert('Pemasukan Kas Kelas Dicatat!');
      setAmount('');
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'Kas Kelas Transaction');
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
          Rp {(classData?.balanceCash || 0).toLocaleString('id-ID')}
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
            <Button type="submit" disabled={loading}>{loading ? '...' : 'Simpan'}</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h4 className="font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
            <History size={16} /> Aktifitas Kelas Terakhir
          </h4>
          <div className="space-y-4">
            {recentTxs.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-slate-700">{tx.notes || 'Pemasukan Kas'}</p>
                  <p className="text-[10px] text-slate-400">
                    {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleTimeString('id-ID') : '...'}
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-600">
                  + {(tx.amount || 0).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
            {recentTxs.length === 0 && (
              <div className="py-6 text-center text-slate-400 italic text-xs">Belum ada aktifitas.</div>
            )}
          </div>
        </Card>

        <Card className="p-6 border-dashed border-2 flex flex-col items-center text-center py-10 opacity-60">
          <History className="text-slate-300 mb-4" size={40} />
          <h4 className="font-bold">Laporan ke TU</h4>
          <p className="text-sm text-slate-500 mb-6">Fitur setor iuran fisik ke TU untuk pencatatan riil sedang disiapkan.</p>
          <Button variant="outline" disabled>Segera Hadir</Button>
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
          { icon: <LayoutDashboard size={20} />, label: 'Overview', path: '/dashboard' },
          { icon: <SchoolIcon size={20} />, label: 'Daftar Sekolah', path: '/dashboard/schools' },
          { icon: <History size={20} />, label: 'Log System', path: '/dashboard/transactions' },
          { icon: <Settings size={20} />, label: 'Pengaturan Admin', path: '/dashboard/settings' },
        ];
      case 'kepala_sekolah':
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Overview', path: '/dashboard' },
          { icon: <SchoolIcon size={20} />, label: 'Manajemen Kelas', path: '/dashboard/classes' },
          { icon: <UserCircle size={20} />, label: 'Data Siswa', path: '/dashboard/students' },
          { icon: <Users size={20} />, label: 'Manajemen Staf', path: '/dashboard/staff' },
          { icon: <History size={20} />, label: 'Audit Transaksi', path: '/dashboard/transactions' },
        ];
      case 'bendahara':
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Kas Utama', path: '/dashboard' },
          { icon: <Plus size={20} />, label: 'Loket Transaksi', path: '/dashboard/transactions/counter' },
          { icon: <UserCircle size={20} />, label: 'Data Siswa', path: '/dashboard/students' },
          { icon: <History size={20} />, label: 'Riwayat Kas', path: '/dashboard/transactions' },
        ];
      case 'tu':
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Loket TU', path: '/dashboard' },
          { icon: <Plus size={20} />, label: 'Loket Transaksi', path: '/dashboard/transactions/counter' },
          { icon: <UserCircle size={20} />, label: 'Cari Siswa', path: '/dashboard/students' },
          { icon: <History size={20} />, label: 'Riwayat Saya', path: '/dashboard/transactions' },
        ];
      case 'bendahara_kelas':
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Kas Kelas', path: '/dashboard' },
          { icon: <History size={20} />, label: 'Log Aktivitas', path: '/dashboard/transactions' },
        ];
      default:
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
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
        <Route path="transactions/counter" element={<TransactionCounter />} />
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
  
  // Use path directly as it is now absolute
  const isActive = currentPath === path || (currentPath === '/dashboard/' && path === '/dashboard');

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
