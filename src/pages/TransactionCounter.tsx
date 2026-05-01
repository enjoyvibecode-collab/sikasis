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
      
      // Filter by TU Authority
      if (profile.role === 'tu' && profile.authorizedGrades && profile.authorizedGrades.length > 0) {
        data = data.filter(s => {
          const grade = s.className.split(' ')[0]; // Assumes format "7 A", "8 B", etc.
          return profile.authorizedGrades?.includes(grade);
        });
      }
      
      setStudents(data);
    });

    const unsubClasses = onSnapshot(classQ, (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassData));
      
      // Filter by TU Authority
      if (profile.role === 'tu' && profile.authorizedGrades && profile.authorizedGrades.length > 0) {
        data = data.filter(c => {
          const grade = c.name.split(' ')[0];
          return profile.authorizedGrades?.includes(grade);
        });
      }
      
      setClasses(data);
    });

    return () => {
      unsubStudents();
      unsubClasses();
    };
  }, [profile]);

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nisn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.className.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Loket Transaksi Cepat</h1>
        <p className="text-sm text-slate-500">Cari siswa atau kelas untuk mulai mencatat transaksi.</p>
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

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <Input
          placeholder={activeTab === 'savings' ? "Cari Nama Siswa atau NISN..." : "Cari Nama Kelas..."}
          className="pl-12 h-14 text-lg border-2 border-brand-sand focus:border-brand-teal transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {activeTab === 'savings' ? (
          filteredStudents.length > 0 ? (
            filteredStudents.slice(0, 10).map(student => (
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
          ) : searchTerm ? (
            <div className="text-center py-10 opacity-40">Siswa tidak ditemukan.</div>
          ) : (
             <div className="text-center py-10 opacity-40">Masukkan nama siswa untuk mencari...</div>
          )
        ) : (
          filteredClasses.length > 0 ? (
            filteredClasses.map(cls => (
              <Card key={cls.id} className="p-4 flex items-center justify-between hover:bg-purple-50 transition-colors border-l-4 border-l-purple-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <SchoolIcon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{cls.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Kelas Terdaftar</p>
                    <p className="text-sm font-bold text-purple-600 mt-0.5">Saldo Kas: Rp {cls.balanceCash.toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700 gap-2"
                  onClick={() => {
                    setSelectedClass(cls);
                    setIsClassCashModalOpen(true);
                  }}
                >
                  KELOLA KAS <ArrowRightCircle size={16} />
                </Button>
              </Card>
            ))
          ) : searchTerm ? (
            <div className="text-center py-10 opacity-40">Kelas tidak ditemukan.</div>
          ) : (
            <div className="text-center py-10 opacity-40">Cari nama kelas...</div>
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
