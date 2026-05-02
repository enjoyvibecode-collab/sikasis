import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/UI';
import { Search, Wallet, School as SchoolIcon, UserCircle, ArrowRightCircle } from 'lucide-react';
import { Student, ClassData } from '../types';
import { SavingsTransactionModal } from '../components/SavingsTransactionModal';
import { ClassCashModal } from '../components/ClassCashModal';

export default function TransactionCounter() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'savings' | 'class_cash'>('savings');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [isClassCashModalOpen, setIsClassCashModalOpen] = useState(false);

  // Fetch Data based on Authority
  useEffect(() => {
    if (!profile?.schoolId) return;

    let studentQ = query(
      collection(db, 'students'),
      where('schoolId', '==', profile.schoolId)
    );

    let classQ = query(
      collection(db, 'classes'),
      where('schoolId', '==', profile.schoolId)
    );

    const unsubStudents = onSnapshot(studentQ, (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      
      // Filter by TU Authority (Grades)
      if (profile.role === 'tu' && profile.authorizedGrades && !profile.authorizedGrades.includes('Semua')) {
        data = data.filter(s => {
          const grade = s.className.split(' ')[0]; 
          return profile.authorizedGrades?.includes(grade);
        });
      }
      
      setStudents(data);
    });

    const unsubClasses = onSnapshot(classQ, (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassData));
      
      // Filter by TU Authority (Grades)
      if (profile.role === 'tu' && profile.authorizedGrades && !profile.authorizedGrades.includes('Semua')) {
        data = data.filter(c => {
          const grade = c.name.split(' ')[0];
          return profile.authorizedGrades?.includes(grade);
        });
      }
      
      // Sort classes by name
      data.sort((a, b) => a.name.localeCompare(b.name));
      
      setClasses(data);
    });

    return () => {
      unsubStudents();
      unsubClasses();
    };
  }, [profile]);

  const currentClassData = classes.find(c => c.id === selectedClassId);

  const filteredStudents = students.filter(s => {
    // If a class is selected, only show students from that class
    if (selectedClassId && s.classId !== selectedClassId) return false;
    
    // Search filter
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.nisn.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Loket Transaksi Cepat</h1>
        <p className="text-sm text-slate-500">Pilih kelas dan tentukan jenis transaksi.</p>
      </div>

      <div className="flex gap-2 p-1 bg-brand-sand/50 rounded-2xl mb-6">
        <button
          onClick={() => { setActiveTab('savings'); setSearchTerm(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'savings' 
              ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20' 
              : 'text-slate-500 hover:bg-white/50'
          }`}
        >
          <Wallet size={18} /> Tabungan Siswa
        </button>
        <button
          onClick={() => { setActiveTab('class_cash'); setSearchTerm(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'class_cash' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
              : 'text-slate-500 hover:bg-white/50'
          }`}
        >
          <SchoolIcon size={18} /> Kas Kelas
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pilih Kelas :</label>
          <select 
            className="w-full h-14 px-4 rounded-xl border-2 border-brand-sand focus:border-brand-teal outline-none font-bold text-slate-700 bg-white"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">-- Pilih Kelas --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {activeTab === 'savings' && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cari Siswa :</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input
                placeholder="Nama / NISN..."
                className="pl-12 h-14 text-lg border-2 border-brand-sand focus:border-brand-teal transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {activeTab === 'savings' ? (
          filteredStudents.length > 0 ? (
            filteredStudents.slice(0, 50).map(student => (
              <Card key={student.id} className="p-4 flex items-center justify-between hover:bg-teal-50/30 transition-colors border-l-4 border-l-brand-teal">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center">
                    <UserCircle size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{student.fullName}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{student.className} • NISN: {student.nisn}</p>
                    <p className="text-sm font-bold text-brand-teal mt-0.5">Saldo: Rp {student.balanceSavings.toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="gap-2"
                  onClick={() => {
                    setSelectedStudent(student);
                    setIsSavingsModalOpen(true);
                  }}
                >
                  TRANSAKSI <ArrowRightCircle size={16} />
                </Button>
              </Card>
            ))
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCircle size={40} />
              </div>
              <p className="text-slate-400 font-medium">
                {selectedClassId ? "Tidak ada siswa di kelas ini yang cocok." : "Silahkan pilih kelas atau masukkan pencarian..."}
              </p>
            </div>
          )
        ) : (
          currentClassData ? (
            <Card className="p-8 border-none shadow-2xl bg-gradient-to-br from-purple-600 to-indigo-800 text-white overflow-hidden relative">
              <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                <SchoolIcon size={200} />
              </div>
              <div className="relative z-10">
                <p className="text-purple-100 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Manajemen Kas Kelas</p>
                <h3 className="text-4xl font-black mb-2">{currentClassData.name}</h3>
                <div className="h-px bg-white/20 w-24 mb-6"></div>
                
                <div className="mb-8">
                  <p className="text-purple-200 text-xs mb-1 font-bold uppercase">Saldo Kas Saat Ini</p>
                  <p className="text-4xl font-bold">Rp {currentClassData.balanceCash.toLocaleString('id-ID')}</p>
                </div>

                <Button 
                  size="lg"
                  className="w-full bg-white text-purple-700 hover:bg-purple-50 font-bold text-base h-14 rounded-xl gap-3 shadow-xl"
                  onClick={() => {
                    setSelectedClass(currentClassData);
                    setIsClassCashModalOpen(true);
                  }}
                >
                  <ArrowRightCircle size={24} /> KELOLA KAS SEKARANG
                </Button>
              </div>
            </Card>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <SchoolIcon size={40} />
              </div>
              <p className="text-slate-400 font-medium">Silahkan pilih kelas untuk mengelola kas.</p>
            </div>
          )
        )}
      </div>

      <SavingsTransactionModal
        isOpen={isSavingsModalOpen}
        onClose={() => setIsSavingsModalOpen(false)}
        student={selectedStudent}
      />

      <ClassCashModal
        isOpen={isClassCashModalOpen}
        onClose={() => setIsClassCashModalOpen(false)}
        classData={selectedClass}
      />
    </div>
  );
}
