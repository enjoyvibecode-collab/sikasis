import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, writeBatch, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal } from '../components/UI';
import { UserPlus, Download, Upload, Trash2, Search, FileDown, Wallet, Edit } from 'lucide-react';
import { Student, ClassData } from '../types';
import { SavingsTransactionModal } from '../components/SavingsTransactionModal';
import * as XLSX from 'xlsx';

export default function StudentManagement() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedStudentForTx, setSelectedStudentForTx] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    nisn: '',
    whatsappStudent: '',
    whatsappParent: '',
    classId: '',
    balanceSavings: '0'
  });

  useEffect(() => {
    if (!profile?.schoolId) return;
    
    const studentsQ = profile.role === 'owner' 
      ? query(collection(db, 'students'))
      : query(collection(db, 'students'), where('schoolId', '==', profile.schoolId));

    const unsubStudents = onSnapshot(studentsQ, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });

    const classesQ = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    const unsubClasses = onSnapshot(classesQ, (snapshot) => {
      setClasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassData)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    });

    return () => {
      unsubStudents();
      unsubClasses();
    };
  }, [profile?.schoolId, profile?.role]);

  const downloadTemplate = () => {
    const template = [
      { 'Nama Lengkap': 'Asep Contoh', 'NISN': '12345678', 'WA Siswa': '08123456789', 'WA Orangtua': '08987654321', 'Nama Kelas': 'X RPL 1', 'Saldo Tabungan Awal': 0 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    
    ws['!cols'] = [
      { wch: 30 }, // Nama Lengkap
      { wch: 15 }, // NISN
      { wch: 20 }, // WA Siswa
      { wch: 20 }, // WA Orangtua
      { wch: 20 }, // Nama Kelas
      { wch: 20 }  // Saldo Awal
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Pendaftaran_Siswa.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      if (data.length > 0) {
        setLoading(true);
        const batch = writeBatch(db);
        
        // Map class names to IDs for easier matching
        const classMap = classes.reduce((acc, c) => ({ ...acc, [c.name.toLowerCase()]: c.id }), {} as any);
        const newClassesCreated = new Set<string>();

        data.forEach((row: any) => {
          // Robust header matching
          const getVal = (possibleKeys: string[]) => {
            const keys = Object.keys(row);
            for (const pk of possibleKeys) {
              const key = keys.find(k => k.trim().toLowerCase() === pk.toLowerCase());
              if (key) return row[key];
            }
            return undefined;
          };

          const rawClassName = String(getVal(['Nama Kelas', 'Kelas', 'Class', 'Kls']) || '').trim();
          const fullName = getVal(['Nama Lengkap', 'Nama', 'Full Name', 'Student Name']);
          const nisnVal = String(getVal(['NISN', 'Nomor Induk', 'ID']) || '');
          const waStudent = String(getVal(['WA Siswa', 'WhatsApp Siswa', 'Phone Student']) || '');
          const waParent = String(getVal(['WA Orangtua', 'WhatsApp Orangtua', 'Phone Parent']) || '');
          const initialBalance = parseInt(getVal(['Saldo Tabungan Awal', 'Saldo', 'Balance']) || '0');
          
          const classNameLower = rawClassName.toLowerCase();
          
          let targetClassId = classMap[classNameLower];

          // Auto-Create Class logic
          if (!targetClassId && rawClassName) {
            targetClassId = `cls_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            classMap[classNameLower] = targetClassId; // Save to map for other students in same file
            
            // Add new class document to batch
            batch.set(doc(db, 'classes', targetClassId), {
              schoolId: profile?.schoolId,
              name: rawClassName,
              code: rawClassName.toUpperCase().replace(/\s+/g, ''),
              description: `Otomatis dibuat dari impor siswa`,
              createdAt: new Date().toISOString()
            });
            newClassesCreated.add(rawClassName);
          } else if (!targetClassId) {
            targetClassId = 'Umum';
          }

          const studentId = `std_${nisnVal || Date.now() + Math.random()}`;
          batch.set(doc(db, 'students', studentId), {
            schoolId: profile?.schoolId,
            fullName: fullName || 'Siswa Tanpa Nama',
            nisn: nisnVal,
            whatsappStudent: waStudent,
            whatsappParent: waParent,
            classId: targetClassId,
            className: rawClassName || 'Umum',
            balanceSavings: isNaN(initialBalance) ? 0 : initialBalance,
            status: 'active',
            createdAt: new Date().toISOString()
          });
        });

        try {
          await batch.commit();
          const msg = newClassesCreated.size > 0 
            ? `${data.length} Siswa berhasil diimpor! Juga berhasil membuat ${newClassesCreated.size} kelas baru: ${Array.from(newClassesCreated).join(', ')}`
            : `${data.length} Siswa berhasil diimpor!`;
          alert(msg);
          e.target.value = '';
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'Batch Student Import');
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const studentId = isEditMode && editingId ? editingId : `std_${formData.nisn || Date.now()}`;
      const className = classes.find(c => c.id === formData.classId)?.name || 'Umum';
      const balanceVal = parseInt(formData.balanceSavings as any) || 0;
      
      const payload: any = {
        fullName: formData.fullName,
        nisn: formData.nisn,
        whatsappStudent: formData.whatsappStudent,
        whatsappParent: formData.whatsappParent,
        classId: formData.classId,
        className,
        schoolId: profile?.schoolId,
        status: 'active',
        updatedAt: new Date().toISOString()
      };

      if (!isEditMode) {
        payload.createdAt = new Date().toISOString();
        payload.balanceSavings = balanceVal;
        
        // Use atomic transaction for registration with initial balance
        await executeAtomicTransaction({
          schoolId: profile!.schoolId!,
          amount: balanceVal,
          type: 'INISIALISASI_TABUNGAN_SISWA',
          studentId: studentId,
          notes: `Saldo awal pendaftaran siswa: ${formData.fullName}`
        }, payload);
      } else {
        // Just update metadata if edit mode (balance adjustment handled via counter)
        await setDoc(doc(db, 'students', studentId), payload, { merge: true });
      }
      
      setIsModalOpen(false);
      setFormData({ fullName: '', nisn: '', whatsappStudent: '', whatsappParent: '', classId: '', balanceSavings: '0' });
      setIsEditMode(false);
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `students/${formData.nisn}`);
    } finally {
      setLoading(false);
    }
  };

  const editStudent = (student: Student) => {
    setFormData({
      fullName: student.fullName,
      nisn: student.nisn,
      whatsappStudent: student.whatsappStudent || '',
      whatsappParent: student.whatsappParent || '',
      classId: student.classId,
      balanceSavings: String(student.balanceSavings || 0)
    });
    setEditingId(student.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const removeStudent = async (id: string) => {
    if (!confirm('Hapus data siswa ini?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.nisn.includes(searchTerm);
    const matchesClass = selectedClassId === 'all' || s.classId === selectedClassId;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Siswa</h1>
          <p className="text-sm text-slate-500">Kelola data siswa dan tabungan di sekolah Anda.</p>
        </div>
        {(profile?.role === 'owner' || profile?.role === 'kepala_sekolah' || profile?.role === 'bendahara') && (
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditMode(false);
                setFormData({ fullName: '', nisn: '', whatsappStudent: '', whatsappParent: '', classId: '', balanceSavings: '0' });
                setIsModalOpen(true);
              }} 
              className="gap-2 flex-1 md:flex-none border-brand-teal text-brand-teal"
            >
              <UserPlus size={18} /> Tambah
            </Button>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2 flex-1 md:flex-none">
              <Download size={18} /> Template
            </Button>
            <label className="flex-1 md:flex-none">
              <div className="bg-brand-teal text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-teal-700 transition-colors h-10 font-bold text-sm">
                <Upload size={18} /> {loading ? 'Memproses...' : 'Impor Excel'}
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={loading} />
            </label>
          </div>
        )}
      </div>

      <Card className="p-2 mb-6">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama siswa atau NISN..." 
              className="w-full h-12 pl-12 pr-4 bg-transparent outline-none text-slate-800"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 border-l md:border-l border-brand-sand/50">
            <select 
              className="w-full h-12 px-4 bg-transparent outline-none text-slate-600 font-medium appearance-none cursor-pointer"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
            >
              <option value="all">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {filteredStudents.map(student => (
          <Card key={student.id} className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-brand-teal transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                {student.fullName.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{student.fullName}</h4>
                <p className="text-xs text-slate-500">
                  NISN: {student.nisn} • Kelas: {classes.find(c => c.id === student.classId)?.name || student.className || student.classId}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-none pt-4 md:pt-0">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tabungan</p>
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-brand-teal">Rp {(student.balanceSavings || 0).toLocaleString('id-ID')}</p>
                  {(profile?.role === 'tu' || profile?.role === 'owner' || profile?.role === 'bendahara' || profile?.role === 'kepala_sekolah') && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-[10px] bg-brand-teal/10 text-brand-teal border-none font-bold"
                      onClick={() => {
                        setSelectedStudentForTx(student);
                        setIsTxModalOpen(true);
                      }}
                    >
                      <Wallet size={12} className="mr-1" />
                      TRANSAKSI
                    </Button>
                  )}
                </div>
              </div>
              
              {(profile?.role === 'owner' || profile?.role === 'kepala_sekolah' || profile?.role === 'bendahara') && (
                <div className="flex items-center gap-1 border-l pl-4 border-slate-100">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3 text-slate-500 hover:text-brand-teal border-none flex items-center gap-1 text-xs font-bold"
                    onClick={() => editStudent(student)}
                  >
                    <Edit size={16} /> <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 w-9 p-0 text-slate-300 hover:text-rose-500 border-none items-center justify-center flex transition-colors"
                    onClick={() => removeStudent(student.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
        {filteredStudents.length === 0 && (
          <div className="py-20 text-center opacity-40">
            <FileDown size={48} className="mx-auto mb-4" />
            <p>Siswa tidak ditemukan atau belum ada data.</p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "Edit Data Siswa" : "Tambah Siswa Baru"}
      >
        <form onSubmit={handleManualAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">Nama Lengkap</label>
              <Input 
                placeholder="Masukkan nama lengkap..." 
                required
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">NISN</label>
              <Input 
                placeholder="Masukkan NISN..." 
                required
                disabled={isEditMode}
                value={formData.nisn}
                onChange={e => setFormData({ ...formData, nisn: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">WA Siswa (Opsional)</label>
              <Input 
                placeholder="08..." 
                value={formData.whatsappStudent}
                onChange={e => setFormData({ ...formData, whatsappStudent: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">WA Orangtua (Opsional)</label>
              <Input 
                placeholder="08..." 
                value={formData.whatsappParent}
                onChange={e => setFormData({ ...formData, whatsappParent: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Pilih Kelas</label>
            <select 
              className="w-full h-11 px-4 rounded-xl border border-brand-sand focus:border-brand-teal outline-none transition-all text-sm"
              required
              value={formData.classId}
              onChange={e => setFormData({ ...formData, classId: e.target.value })}
            >
              <option value="">-- Pilih Kelas --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {!isEditMode && (
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">Saldo Tabungan Awal (Rp)</label>
              <Input 
                type="number"
                placeholder="0" 
                value={formData.balanceSavings}
                onChange={e => setFormData({ ...formData, balanceSavings: e.target.value })}
              />
              <p className="text-[10px] text-slate-400 mt-1 italic">*Hanya isi jika ada saldo yang dibawa dari sistem lama.</p>
            </div>
          )}
          <Button className="w-full h-12 shadow-lg shadow-brand-teal/20" disabled={loading}>
            {loading ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Daftarkan Siswa')}
          </Button>
        </form>
      </Modal>

      <SavingsTransactionModal 
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setSelectedStudentForTx(null);
        }}
        student={selectedStudentForTx}
      />
    </div>
  );
}
