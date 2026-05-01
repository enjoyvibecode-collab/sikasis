import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, writeBatch, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal } from '../components/UI';
import { UserPlus, Download, Upload, Trash2, Search, FileDown } from 'lucide-react';
import { Student, ClassData } from '../types';
import * as XLSX from 'xlsx';

export default function StudentManagement() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    nisn: '',
    whatsappStudent: '',
    whatsappParent: '',
    classId: ''
  });

  useEffect(() => {
    if (!profile?.schoolId) return;
    
    const studentsQ = profile.role === 'owner' 
      ? query(collection(db, 'students'))
      : query(collection(db, 'students'), where('schoolId', '==', profile.schoolId));

    const unsubStudents = onSnapshot(studentsQ, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    });

    const classesQ = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    const unsubClasses = onSnapshot(classesQ, (snapshot) => {
      setClasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassData)));
    });

    return () => {
      unsubStudents();
      unsubClasses();
    };
  }, [profile?.schoolId, profile?.role]);

  const downloadTemplate = () => {
    const template = [
      { 'Nama Lengkap': 'Asep Contoh', 'NISN': '12345678', 'WA Siswa': '08123456789', 'WA Orangtua': '08987654321', 'Nama Kelas': 'X RPL 1' }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
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

        data.forEach((row: any) => {
          const studentId = `std_${row.NISN || Date.now() + Math.random()}`;
          const className = String(row['Nama Kelas'] || '').toLowerCase();
          const targetClassId = classMap[className] || 'Umum';

          batch.set(doc(db, 'students', studentId), {
            schoolId: profile?.schoolId,
            fullName: row['Nama Lengkap'],
            nisn: String(row['NISN']),
            whatsappStudent: String(row['WA Siswa'] || ''),
            whatsappParent: String(row['WA Orangtua'] || ''),
            classId: targetClassId,
            balanceSavings: 0,
            status: 'active',
            createdAt: new Date().toISOString()
          });
        });

        try {
          await batch.commit();
          alert(`${data.length} Siswa berhasil diimpor!`);
          e.target.value = '';
        } catch (err) {
          console.error(err);
          alert('Gagal mengimpor data. Periksa izin atau format file Anda.');
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
      const studentId = `std_${formData.nisn || Date.now()}`;
      await setDoc(doc(db, 'students', studentId), {
        ...formData,
        schoolId: profile?.schoolId,
        balanceSavings: 0,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setFormData({ fullName: '', nisn: '', whatsappStudent: '', whatsappParent: '', classId: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeStudent = async (id: string) => {
    if (!confirm('Hapus data siswa ini?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (err) {
      alert('Gagal menghapus siswa. Periksa izin Firestore.');
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nisn.includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Siswa</h1>
          <p className="text-sm text-slate-500">Kelola data siswa dan tabungan di sekolah Anda.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
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
      </div>

      <Card className="p-2 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama siswa atau NISN..." 
            className="w-full h-12 pl-12 pr-4 bg-transparent outline-none text-slate-800"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
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
                <p className="text-xs text-slate-500">NISN: {student.nisn} • Kelas: {student.classId}</p>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tabungan</p>
                <p className="font-display font-bold text-brand-teal">Rp {student.balanceSavings.toLocaleString('id-ID')}</p>
              </div>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-slate-400 hover:text-rose-500 border-none">
                <Trash2 size={18} />
              </Button>
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
    </div>
  );
}
