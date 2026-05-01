import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/UI';
import { History, ArrowUpRight, ArrowDownLeft, Wallet, UserCircle, School as SchoolIcon } from 'lucide-react';

export default function TransactionHistory() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.schoolId && profile?.role !== 'owner') return;

    let q;
    if (profile?.role === 'owner') {
      q = query(
        collection(db, 'transactions'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
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
  }, [profile?.schoolId, profile?.role, profile?.id]);

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Riwayat Transaksi</h1>
        <p className="text-sm text-slate-500">
          {profile?.role === 'owner' 
            ? 'Log aktivitas keuangan global sistem SiKasis.' 
            : 'Log aktivitas keuangan terbaru di sekolah Anda.'}
        </p>
      </div>

      <div className="space-y-3">
        {transactions.map(tx => (
          <Card key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                {getIcon(tx.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{getLabel(tx.type)}</h4>
                  {profile?.role === 'owner' && (
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                      ID: {tx.schoolId?.substring(0, 8)}...
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {new Date(tx.timestamp).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className={`font-display font-bold ${tx.type.includes('SETOR') || tx.type.includes('MASUK') ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.type.includes('SETOR') || tx.type.includes('MASUK') ? '+' : '-'} Rp {tx.amount?.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">ID: {tx.id.slice(-6)}</p>
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
