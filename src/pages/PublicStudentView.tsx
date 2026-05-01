import React, { useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Button, Input, Card } from '../components/UI';
import { Wallet, Search, TrendingUp, History, User, AlertCircle, RefreshCw, Download, FileText, Table } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Transaction } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function PublicStudentView() {
  const [nisn, setNisn] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn) return;

    setLoading(true);
    setError('');
    setStudent(null);
    setTransactions([]);

    try {
      const q = query(collection(db, 'students'), where('nisn', '==', nisn), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Siswa dengan NISN tersebut tidak ditemukan.');
      } else {
        const studentDoc = querySnapshot.docs[0];
        const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
        setStudent(studentData);

        const txQ = query(
          collection(db, 'transactions'),
          where('studentId', '==', studentDoc.id),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        const txSnapshot = await getDocs(txQ);
        setTransactions(txSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'students');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!student) return;
    const data = transactions.map(tx => ({
      Tanggal: tx.timestamp?.toDate().toLocaleDateString('id-ID'),
      Jenis: tx.type.replace(/_/g, ' '),
      Jumlah: tx.amount,
      Catatan: tx.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Tabungan");
    XLSX.writeFile(wb, `Tabungan_${student.nisn}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    if (!student) return;
    const doc = new jsPDF() as any;
    
    doc.setFontSize(18);
    doc.text('SiKasis - Laporan Tabungan Siswa', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Nama: ${student.fullName}`, 14, 30);
    doc.text(`NISN: ${student.nisn}`, 14, 36);
    doc.text(`Saldo Akhir: Rp ${student.balanceSavings.toLocaleString('id-ID')}`, 14, 42);
    
    const tableData = transactions.map(tx => [
      tx.timestamp?.toDate().toLocaleDateString('id-ID'),
      tx.type.replace(/_/g, ' '),
      `Rp ${tx.amount.toLocaleString('id-ID')}`,
      tx.notes || '-'
    ]);

    doc.autoTable({
      startY: 50,
      head: [['Tanggal', 'Jenis Transaksi', 'Jumlah', 'Keterangan']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110] }
    });

    doc.save(`Laporan_Tabungan_${student.nisn}.pdf`);
  };

  return (
    <div className="min-h-screen bg-brand-cream pb-20">
      <header className="bg-brand-teal text-white py-12 px-6 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Wallet size={20} />
            <span className="font-display text-xl font-bold tracking-tighter">SiKasis</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">Cek Tabungan Mandiri</h1>
          <p className="text-teal-50/80 max-w-xl mx-auto">Akses informasi keuangan Anda secara transparan dan aman.</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto -mt-8 px-6">
        <Card className="p-6 shadow-xl border-none">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Masukkan NISN Anda..." 
                value={nisn}
                onChange={e => setNisn(e.target.value)}
                className="h-12 border-brand-sand focus:border-brand-teal"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 gap-2" disabled={loading}>
              {loading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
              Cari Data
            </Button>
          </form>
          {error && (
            <div className="mt-4 flex items-center gap-2 text-rose-500 text-sm bg-rose-50 p-3 rounded-xl border border-rose-100">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </Card>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-12">
        <AnimatePresence mode="wait">
          {student ? (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-8 bg-brand-teal text-white border-none shadow-xl">
                  <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-2">Saldo Tabungan Saat Ini</p>
                  <h2 className="text-4xl font-display font-bold">
                    Rp {student.balanceSavings.toLocaleString('id-ID')}
                  </h2>
                  <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><User size={20} /></div>
                    <div>
                      <p className="font-bold leading-none">{student.fullName}</p>
                      <p className="text-teal-100 text-xs mt-1">NISN: {student.nisn}</p>
                    </div>
                  </div>
                </Card>

                <div className="flex flex-col gap-4">
                  <Button variant="secondary" onClick={exportToPDF} className="h-full gap-3 py-6 justify-center text-lg">
                    <FileText size={24} /> Cetak Laporan (PDF)
                  </Button>
                  <Button variant="outline" onClick={exportToExcel} className="h-full gap-3 py-6 justify-center text-lg bg-white">
                    <Table size={24} /> Unduh Data (Excel)
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <History size={18} className="text-brand-teal" /> Riwayat Transaksi
                  </h3>
                </div>
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <Card key={tx.id} className="p-4 flex justify-between items-center bg-white border-brand-sand/50">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{tx.type.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-slate-400">
                          {tx.timestamp?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.type.includes('TARIK') ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {tx.type.includes('TARIK') ? '-' : '+'} Rp {tx.amount.toLocaleString('id-ID')}
                        </p>
                        {tx.notes && <p className="text-[10px] text-slate-400 italic mt-1">{tx.notes}</p>}
                      </div>
                    </Card>
                  ))}
                  {transactions.length === 0 && (
                    <div className="py-12 text-center text-slate-400 border-2 border-dashed border-brand-sand rounded-2xl bg-white/50">
                      Belum ada riwayat transaksi.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : !loading && (
            <div className="py-20 text-center opacity-50">
              <div className="w-20 h-20 bg-brand-sand text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6"><Search size={40} /></div>
              <p className="text-slate-500 font-medium">Masukkan NISN untuk melihat data tabungan Anda</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
