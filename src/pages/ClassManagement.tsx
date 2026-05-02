import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal } from '../components/UI';
import { School as SchoolIcon, Plus, Trash2, Users, Wallet, ListPlus, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { ClassData } from '../types';
import { ClassCashModal } from '../components/ClassCashModal';
import * as XLSX from 'xlsx';

export default function ClassManagement() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMassModalOpen, setIsMassModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [selectedClassForCash, setSelectedClassForCash] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.schoolId) return;
    const q = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    const unsub = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassData)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    });
    return unsub;
  }, [profile?.schoolId]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    
    setLoading(true);
    try {
      const classId = `class_${Date.now()}`;
      const bal = parseInt(initialBalance) || 0;
      await setDoc(doc(db, 'classes', classId), {
        schoolId: profile?.schoolId,
        name: newClassName,
        balanceCash: bal,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      setIsModalOpen(false);
      setNewClassName('');
      setInitialBalance('0');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'classes');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const data = [
      { 'Nama Kelas': 'Contoh: X RPL 1' },
      { 'Nama Kelas': 'Contoh: XI IPA 2' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Kelas');
    XLSX.writeFile(workbook, 'Template_Mass_Upload_Kelas.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const classNames = data
          .map(row => (row['Nama Kelas'] || row['nama_kelas'] || row['Name']).toString().trim())
          .filter(name => name !== '' && !name.toLowerCase().includes('contoh:'));

        if (classNames.length === 0) {
          alert('Tidak ada data kelas yang valid ditemukan di file Excel.');
          setUploadLoading(false);
          return;
        }

        if (!confirm(`Ditemukan ${classNames.length} kelas. Lanjutkan simpan?`)) {
          setUploadLoading(false);
          return;
        }

        const batch = writeBatch(db);
        classNames.forEach((name, index) => {
          const classId = `class_${Date.now()}_${index}`;
          batch.set(doc(db, 'classes', classId), {
            schoolId: profile?.schoolId,
            name,
            balanceCash: 0,
            status: 'active',
            createdAt: new Date().toISOString()
          });
        });

        await batch.commit();
        alert('Berhasil mengunggah data kelas!');
        setIsMassModalOpen(false);
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format kolom benar.');
        console.error(err);
      } finally {
        setUploadLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const removeClass = async (id: string, name: string) => {
    if (!confirm(`Hapus kelas ${name}? Data siswa di kelas ini mungkin akan terpengaruh.`)) return;
    try {
      await deleteDoc(doc(db, 'classes', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `classes/${id}`);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Kelas</h1>
          <p className="text-sm text-slate-500">Daftarkan kelas-kelas yang ada di sekolah Anda.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsMassModalOpen(true)} className="gap-2 border-brand-teal text-brand-teal hover:bg-brand-teal/5">
            <ListPlus size={18} /> Tambah Massal
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={18} /> Tambah Kelas
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        {classes.map(cls => (
          <Card key={cls.id} className="p-6 relative group overflow-hidden border-2 hover:border-brand-teal transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-brand-teal/10 text-brand-teal rounded-2xl flex items-center justify-center mb-4">
                <SchoolIcon size={32} />
              </div>
              <h3 className="font-bold text-xl text-slate-800">{cls.name}</h3>
              <div className="mt-4 pt-4 border-t w-full flex justify-between items-center text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Users size={14} /> <span>Saldo Kas:</span>
                </div>
                <span className="font-bold text-slate-800">Rp {(cls.balanceCash || 0).toLocaleString('id-ID')}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4 bg-brand-teal/10 text-brand-teal text-xs font-bold"
                onClick={() => {
                  setSelectedClassForCash(cls);
                  setIsCashModalOpen(true);
                }}
              >
                <Wallet size={14} className="mr-2" /> KELOLA KAS
              </Button>
            </div>

            <button 
              onClick={() => removeClass(cls.id, cls.name)}
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={18} />
            </button>
          </Card>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-40">
            <p>Belum ada kelas. Klik "Tambah Kelas" untuk memulai.</p>
          </div>
        )}
      </div>

      <ClassCashModal 
        isOpen={isCashModalOpen}
        onClose={() => {
          setIsCashModalOpen(false);
          setSelectedClassForCash(null);
        }}
        classData={selectedClassForCash}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Kelas Baru">
        <form onSubmit={handleAddClass} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Nama Kelas</label>
            <Input 
              placeholder="Contoh: X RPL 1 atau XII IPA 2" 
              required
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Saldo Awal Kas Kelas (Rp)</label>
            <Input 
              type="number"
              placeholder="0" 
              value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1 italic">*Hanya isi jika kelas sudah memiliki kas yang berjalan.</p>
          </div>
          <Button className="w-full h-12 mt-4" disabled={loading}>
            {loading ? 'Memproses...' : 'Simpan Kelas'}
          </Button>
        </form>
      </Modal>
      <Modal isOpen={isMassModalOpen} onClose={() => setIsMassModalOpen(false)} title="Tambah Kelas Massal">
        <div className="space-y-6 py-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
            <div className="mt-1 text-blue-600">
              <Download size={20} />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 text-sm">Langkah 1: Unduh Template</h4>
              <p className="text-xs text-blue-700 mb-3">Gunakan template Excel resmi kami agar sistem bisa mengenali data Anda dengan benar.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-blue-200 text-blue-600 hover:bg-blue-100 gap-2"
                onClick={downloadTemplate}
              >
                <FileSpreadsheet size={16} /> Unduh Template Excel
              </Button>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-900">
            <div className="mt-1 text-emerald-600">
              <Upload size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-emerald-900 text-sm">Langkah 2: Unggah File</h4>
              <p className="text-xs text-emerald-700 mb-3">Isi file Excel tersebut dengan nama-nama kelas, lalu unggah di sini.</p>
              
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".xlsx, .xls" 
                onChange={handleFileUpload}
              />
              
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
              >
                {uploadLoading ? (
                  'Memproses...'
                ) : (
                  <>
                    <FileSpreadsheet size={18} /> Pilih & Unggah Excel
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-slate-400 italic">
              *Hanya file berekstensi .xlsx atau .xls yang didukung. Kolom harus bernama "Nama Kelas".
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
