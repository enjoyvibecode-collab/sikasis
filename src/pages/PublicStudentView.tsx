import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Button, Input, Card } from '../components/UI';
import { Wallet, Search, TrendingUp, History, User, AlertCircle, RefreshCw, Download, FileText, Table, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Transaction } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function PublicStudentView() {
  const navigate = useNavigate();
  const [nisn, setNisn] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [school, setSchool] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn) return;

    setLoading(true);
    setError('');
    setStudent(null);
    setTransactions([]);
    setSchool(null);
    setAnnouncements([]);

    try {
      const q = query(collection(db, 'students'), where('nisn', '==', nisn), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Siswa dengan NISN tersebut tidak ditemukan.');
      } else {
        const studentDoc = querySnapshot.docs[0];
        const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
        setStudent(studentData);

        // Fetch School Info - use getDoc because we have the ID and get is public
        try {
          const schoolRef = doc(db, 'schools', studentData.schoolId);
          const schoolSnap = await getDoc(schoolRef);
          if (schoolSnap.exists()) {
            setSchool(schoolSnap.data());
          }
        } catch (err) {
          console.warn('Could not fetch school info', err);
        }

        // Fetch Announcements 
        const annQ = query(
          collection(db, 'announcements'), 
          where('schoolId', '==', studentData.schoolId),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const annSnap = await getDocs(annQ);
        setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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
      console.error(err);
      setError('Terjadi kesalahan saat mengambil data.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setNisn('');
    setStudent(null);
    setTransactions([]);
    setSchool(null);
    setAnnouncements([]);
    setError('');
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
      <header className="bg-brand-teal text-white py-12 px-6 text-center relative">
        <div className="absolute top-6 left-6">
          <Link to="/" className="flex items-center gap-2 text-teal-100 hover:text-white transition-colors no-underline">
            <ArrowLeft size={20} /> <span className="font-semibold">Kembali</span>
          </Link>
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
              <Wallet size={18} />
            </div>
            <span className="font-display text-xl font-bold tracking-tighter">SiKasis</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">Cek Tabungan Mandiri</h1>
          <p className="text-teal-50/80 max-w-xl mx-auto text-sm md:text-base">Akses informasi keuangan Anda secara transparan cukup menggunakan NISN.</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto -mt-8 px-6">
        <Card className="p-6 shadow-xl border-none bg-white/80 backdrop-blur-lg">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Masukkan NISN Anda..." 
                value={nisn}
                onChange={e => setNisn(e.target.value)}
                className="h-12 pl-12 border-brand-sand focus:border-brand-teal bg-white"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="lg" className="flex-1 sm:flex-none h-12 gap-2 shadow-lg shadow-brand-teal/20" disabled={loading}>
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
                Cari
              </Button>
              {student && (
                <Button type="button" variant="ghost" onClick={handleReset} className="h-12 text-slate-400">
                  Reset
                </Button>
              )}
            </div>
          </form>
          <p className="text-[10px] text-slate-400 mt-3 text-center italic">"Privasi Aman: Jangan bagikan NISN Anda kepada orang lain."</p>
          {error && (
            <div className="mt-4 flex items-center gap-2 text-rose-500 text-sm bg-rose-50 p-3 rounded-xl border border-rose-100">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </Card>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-12 pb-20">
        <AnimatePresence mode="wait">
          {student ? (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Header Info */}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-slate-800">{school?.name || 'Sekolah Terdaftar'}</h3>
                <p className="text-slate-500 text-sm">Laporan Keuangan Siswa Terpusat</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-8 bg-brand-teal text-white border-none shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Wallet size={120} />
                  </div>
                  <p className="text-teal-100 text-[10px] font-bold uppercase tracking-widest mb-2 relative z-10">Saldo Tabungan Saat Ini</p>
                  <h2 className="text-4xl md:text-5xl font-display font-bold relative z-10">
                    Rp {student.balanceSavings.toLocaleString('id-ID')}
                  </h2>
                  <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm"><User size={20} /></div>
                    <div>
                      <p className="font-bold leading-none text-sm">{student.fullName}</p>
                      <p className="text-teal-100 text-[10px] uppercase font-bold tracking-tighter mt-1">{student.className} • NISN: {student.nisn}</p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-4">
                  {/* Share/Export Actions */}
                  <div className="grid grid-cols-2 gap-3 h-full">
                    <button 
                      onClick={exportToPDF}
                      className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-brand-sand shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">Cetak PDF</span>
                    </button>
                    <button 
                      onClick={exportToExcel}
                      className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-brand-sand shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Table size={24} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">Unduh Excel</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Announcements Section */}
              {announcements.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                    <AlertCircle size={16} /> Pengumuman Sekolah
                  </h3>
                  <div className="grid gap-4">
                    {announcements.map(ann => (
                      <Card key={ann.id} className="p-4 bg-blue-50 border-blue-100 shadow-none border-l-4 border-l-blue-500">
                        <h4 className="font-bold text-blue-900 text-sm mb-1">{ann.title}</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">{ann.content}</p>
                        <p className="text-[9px] text-blue-400 mt-2 font-bold uppercase tracking-tighter">
                          {ann.createdAt?.toDate?.().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                    <History size={16} /> Riwayat Transaksi Terbaru
                  </h3>
                </div>
                <div className="space-y-3">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center bg-white p-4 rounded-3xl border border-brand-sand transition-all hover:border-brand-teal/30">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          tx.type.includes('TARIK') ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                        }`}>
                          {tx.type.includes('TARIK') ? <TrendingUp className="rotate-180" size={18} /> : <TrendingUp size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{tx.type.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">
                            {tx.timestamp?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.type.includes('TARIK') ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {tx.type.includes('TARIK') ? '-' : '+'} {tx.amount.toLocaleString('id-ID')}
                        </p>
                        {tx.notes && <p className="text-[9px] text-slate-400 italic mt-0.5 line-clamp-1">{tx.notes}</p>}
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="py-20 text-center text-slate-300 border-2 border-dashed border-brand-sand rounded-[40px] bg-white/30">
                      <History size={40} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm italic">Belum ada riwayat transaksi.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center opacity-50">
              <div className="w-24 h-24 bg-brand-sand/50 text-slate-300 rounded-[40px] flex items-center justify-center mx-auto mb-8 animate-bounce-slow">
                <Search size={48} />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-700 mb-2">Siap Melayani Anda</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Silakan masukkan NISN valid untuk melihat ringkasan keuangan sekolah Anda.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
