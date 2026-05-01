import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/UI';
import { History, ArrowUpRight, ArrowDownLeft, Wallet, UserCircle, School as SchoolIcon } from 'lucide-react';

export default function TransactionHistory() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<{id: string, name: string}[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  useEffect(() => {
    const fetchSchools = async () => {
      if (profile?.role !== 'owner') return;
      try {
        const q = query(collection(db, 'schools'));
        const snap = await getDocs(q);
        setSchools(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
      } catch (err) {
        console.error("Error fetching schools:", err);
      }
    };
    fetchSchools();
  }, [profile?.role]);

  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!profile?.schoolId && profile?.role !== 'owner') return;

    let q;
    let constraints: any[] = [];

    if (profile?.role === 'owner') {
      if (selectedSchool !== 'all') {
        constraints.push(where('schoolId', '==', selectedSchool));
      }
    } else {
      constraints.push(where('schoolId', '==', profile.schoolId));
      if (profile.role === 'tu') {
        constraints.push(where('executorId', '==', profile.id));
      }
    }

    if (filterType !== 'all') {
      if (filterType === 'SAVINGS') {
        constraints.push(where('type', 'in', ['SETOR_TABUNGAN', 'TARIK_TABUNGAN']));
      } else if (filterType === 'CLASS_CASH') {
        constraints.push(where('type', 'in', ['SETOR_KAS_KELAS', 'TARIK_KAS_KELAS']));
      } else if (filterType === 'TU_MODAL') {
        constraints.push(where('type', 'in', ['MODAL_TU_MASUK', 'MODAL_TU_KEMBALI']));
      }
    }

    q = query(
      collection(db, 'transactions'),
      ...constraints,
      orderBy('timestamp', 'desc'),
      limit(filterType !== 'all' ? 50 : 100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return unsub;
  }, [profile?.schoolId, profile?.role, profile?.id, selectedSchool, filterType]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'SETOR_TABUNGAN':
      case 'SETOR_KAS_KELAS': 
        return <ArrowUpRight className="text-emerald-500" />;
      case 'TARIK_TABUNGAN':
      case 'TARIK_KAS_KELAS': 
        return <ArrowDownLeft className="text-rose-500" />;
      case 'MODAL_TU_MASUK': return <Wallet className="text-blue-500" />;
      case 'MODAL_TU_KEMBALI': return <ArrowDownLeft className="text-blue-500" />;
      default: return <History className="text-slate-400" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'SETOR_TABUNGAN': return 'Setor Tabungan';
      case 'TARIK_TABUNGAN': return 'Tarik Tabungan';
      case 'SETOR_KAS_KELAS': return 'Kas Kelas Masuk';
      case 'TARIK_KAS_KELAS': return 'Kas Kelas Keluar';
      case 'MODAL_TU_MASUK': return 'Modal TU Masuk';
      case 'MODAL_TU_KEMBALI': return 'Modal TU Kembali';
      default: return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Riwayat Transaksi</h1>
          <p className="text-sm text-slate-500">
            {profile?.role === 'owner' 
              ? 'Log aktivitas keuangan global sistem SiKasis.' 
              : 'Log aktivitas keuangan terbaru di sekolah Anda.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-100 min-w-[200px]">
            <History size={16} className="text-slate-400 ml-1" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none w-full cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              <option value="SAVINGS">Tabungan Siswa</option>
              <option value="CLASS_CASH">Kas Kelas</option>
              <option value="TU_MODAL">Modal TU</option>
            </select>
          </div>

          {profile?.role === 'owner' && (
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-100 min-w-[200px]">
              <SchoolIcon size={16} className="text-brand-teal ml-1" />
              <select 
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none w-full cursor-pointer"
              >
                <option value="all">Semua Sekolah</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {transactions.map(tx => (
          <Card key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-l-4 border-l-transparent hover:border-l-brand-teal group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                {getIcon(tx.type)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{getLabel(tx.type)}</h4>
                  {tx.entityName && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                      {tx.entityName}
                    </span>
                  )}
                  {profile?.role === 'owner' && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{tx.schoolId?.substring(0, 6)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                  "{tx.notes || tx.description || 'Tanpa keterangan'}"
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-slate-400">
                    {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending...'}
                  </p>
                  <span className="text-[10px] text-slate-300">•</span>
                  <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                    Petugas ID: {tx.executorId?.substring(0, 6)}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className={`font-display font-bold text-base ${tx.type.includes('SETOR') || tx.type.includes('MASUK') ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.type.includes('SETOR') || tx.type.includes('MASUK') ? '+' : '-'} Rp {tx.amount?.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-slate-300 font-mono uppercase tracking-tighter">ID: {tx.id.slice(-6)}</p>
            </div>
          </Card>
        ))}

        {transactions.length === 0 && !loading && (
          <div className="py-20 text-center opacity-30 flex flex-col items-center">
            <History size={48} className="mb-4" />
            <p>Belum ada riwayat transaksi.</p>
          </div>
        )}
      </div>
    </div>
  );
}
