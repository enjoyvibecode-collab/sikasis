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

  useEffect(() => {
    if (!profile?.schoolId && profile?.role !== 'owner') return;

    let q;
    if (profile?.role === 'owner') {
      if (selectedSchool === 'all') {
        q = query(
          collection(db, 'transactions'),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
      } else {
        q = query(
          collection(db, 'transactions'),
          where('schoolId', '==', selectedSchool),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
      }
    } else {
      q = query(
        collection(db, 'transactions'),
        where('schoolId', '==', profile.schoolId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      // If TU, filter by their own executions
      if (profile.role === 'tu') {
        q = query(
          collection(db, 'transactions'),
          where('schoolId', '==', profile.schoolId),
          where('executorId', '==', profile.id),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
      }
    }

    const unsub = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return unsub;
  }, [profile?.schoolId, profile?.role, profile?.id, selectedSchool]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'TABUNGAN_SETOR': return <ArrowUpRight className="text-emerald-500" />;
      case 'TABUNGAN_TARIK': return <ArrowDownLeft className="text-rose-500" />;
      case 'MODAL_TU_MASUK': return <Wallet className="text-blue-500" />;
      default: return <History className="text-slate-400" />;
    }
  };

  const getLabel = (type: string) => {
    return type.replace(/_/g, ' ');
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

        {profile?.role === 'owner' && (
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-100 min-w-[240px]">
            <SchoolIcon size={18} className="text-brand-teal ml-2" />
            <select 
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none w-full cursor-pointer"
            >
              <option value="all">Semua Sekolah (Global)</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {transactions.map(tx => (
          <Card key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-l-4 border-l-transparent hover:border-l-brand-teal">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm shrink-0">
                {getIcon(tx.type)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight truncate">{getLabel(tx.type)}</h4>
                  {profile?.role === 'owner' && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full font-bold uppercase">
                        GLOBAL LOG
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        #{tx.schoolId?.substring(0, 6)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-slate-400">
                    {new Date(tx.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <span className="text-[10px] text-slate-300">•</span>
                  <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                    Admin: {tx.executorId?.substring(0, 6)}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className={`font-display font-bold text-base ${tx.type.includes('SETOR') || tx.type.includes('MASUK') ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.type.includes('SETOR') || tx.type.includes('MASUK') ? '+' : '-'} Rp {tx.amount?.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-slate-300 font-mono uppercase">ID: {tx.id.slice(-6)}</p>
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
