import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal } from '../components/UI';
import { Users, UserPlus, Trash2, Mail, Shield, ShieldCheck } from 'lucide-react';
import { UserRole, UserProfile } from '../types';

export default function StaffManagement() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'tu' as UserRole,
    classId: '' as string | undefined
  });
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.schoolId) return;
    const q = query(
      collection(db, 'users'), 
      where('schoolId', '==', profile.schoolId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    const cq = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    getDocs(cq).then(s => setClasses(s.docs.map(d => ({id: d.id, ...d.data()}))));

    return unsub;
  }, [profile?.schoolId]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Logic for adding staff (using email as ID for simplicity or separate profile)
      // Note: In real app, you'd use Firebase Admin or a sign up flow. 
      // Here we create a document that the staff will "claim" when they login with that email.
      const username = formData.email.split('@')[0];
      const newStaffId = `staff_${Date.now()}`; // Just for demo, usually it's UID from Auth
      
      await setDoc(doc(db, 'users', newStaffId), {
        username,
        fullName: formData.fullName,
        role: formData.role,
        schoolId: profile?.schoolId,
        classId: formData.classId,
        status: 'active',
        inviteEmail: formData.email // For matching on login
      });
      
      setIsModalOpen(false);
      setFormData({ email: '', fullName: '', role: 'tu', classId: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeStaff = async (id: string) => {
    if (!confirm('Hapus staf ini?')) return;
    await deleteDoc(doc(db, 'users', id));
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">Manajemen Staf</h1>
          <p className="text-sm text-slate-500">Daftarkan dan kelola akses tim administrasi sekolah.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <UserPlus size={18} /> Tambah Staf
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(member => (
          <Card key={member.id} className="p-6 relative group overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${
              member.role === 'bendahara' ? 'bg-emerald-500' : 'bg-blue-500'
            }`}></div>
            
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                member.role === 'bendahara' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {member.role === 'bendahara' ? <ShieldCheck size={24} /> : <Shield size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{member.fullName}</h3>
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">{member.role.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Mail size={14} /> <span>{member.inviteEmail || member.username + '@school.com'}</span>
              </div>
            </div>

            {member.role !== 'kepala_sekolah' && (
               <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200"
                onClick={() => removeStaff(member.id)}
               >
                <Trash2 size={14} className="mr-2" /> Hapus Akses
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Undang Staf Baru">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Alamat Email (Akun Google)</label>
            <Input 
              type="email"
              placeholder="nama@gmail.com" 
              required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Nama Lengkap</label>
            <Input 
              placeholder="Contoh: Budi Santoso" 
              required 
              value={formData.fullName}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Peran (Role)</label>
            <select 
              className="w-full h-11 px-4 rounded-xl border border-slate-200"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as any})}
            >
              <option value="bendahara">Bendahara (Admin Keuangan)</option>
              <option value="tu">TU (Petugas Lapangan)</option>
              <option value="bendahara_kelas">Bendahara Kelas (Wali/Siswa)</option>
            </select>
          </div>
          {formData.role === 'bendahara_kelas' && (
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">Tugas di Kelas</label>
              <select 
                className="w-full h-11 px-4 rounded-xl border border-slate-200"
                required
                onChange={e => setFormData({...formData, classId: e.target.value})}
              >
                <option value="">Pilih Kelas...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <Button className="w-full h-12 mt-4" disabled={loading}>
            {loading ? 'Memproses...' : 'Simpan & Berikan Akses'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
