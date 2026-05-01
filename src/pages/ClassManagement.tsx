import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal } from '../components/UI';
import { School as SchoolIcon, Plus, Trash2, Users, Wallet } from 'lucide-react';
import { ClassData } from '../types';
import { ClassCashModal } from '../components/ClassCashModal';

export default function ClassManagement() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [selectedClassForCash, setSelectedClassForCash] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(false);
  const [newClassName, setNewClassName] = useState('');

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
      await setDoc(doc(db, 'classes', classId), {
        schoolId: profile?.schoolId,
        name: newClassName,
        balanceCash: 0,
        status: 'active'
      });
      setIsModalOpen(false);
      setNewClassName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'classes');
    } finally {
      setLoading(false);
    }
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
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={18} /> Tambah Kelas
        </Button>
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
                <span className="font-bold text-slate-800">Rp {cls.balanceCash.toLocaleString('id-ID')}</span>
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
          <Button className="w-full h-12 mt-4" disabled={loading}>
            {loading ? 'Memproses...' : 'Simpan Kelas'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
