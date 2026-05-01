import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
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
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'tu' as UserRole,
    classId: '' as string | undefined,
    authorizedGrades: [] as string[]
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggleGrade = (grade: string) => {
    setFormData(prev => ({
      ...prev,
      authorizedGrades: prev.authorizedGrades.includes(grade)
        ? prev.authorizedGrades.filter(g => g !== grade)
        : [...prev.authorizedGrades, grade]
    }));
  };

  useEffect(() => {
    if (!profile?.schoolId) return;
    const q = query(
      collection(db, 'users'), 
      where('schoolId', '==', profile.schoolId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Filter out current user (headmaster doesn't need to see themselves in staff list)
      const filteredStaff = allUsers.filter(u => u.id !== profile?.id);
      
      // Deduplicate by identity (email or username)
      const staffMap = new Map<string, any>();
      filteredStaff.forEach(u => {
        // Try to find a unique key: real email > invite email > username
        const identityKey = (u.email || u.inviteEmail || u.username || u.id).toLowerCase();
        
        const existing = staffMap.get(identityKey);
        
        if (!existing) {
          staffMap.set(identityKey, u);
        } else {
          // Prefer records that are NOT placeholders (active sessions)
          const existingIsPlaceholder = existing.id.startsWith('staff_');
          const currentIsPlaceholder = u.id.startsWith('staff_');
          
          if (existingIsPlaceholder && !currentIsPlaceholder) {
            staffMap.set(identityKey, u);
          }
        }
      });

      setStaff(Array.from(staffMap.values()));
    });

    const cq = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    getDocs(cq).then(s => setClasses(s.docs.map(d => ({id: d.id, ...d.data()}))));

    return unsub;
  }, [profile?.schoolId]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingStaffId) {
        // UPDATE MODE
        await setDoc(doc(db, 'users', editingStaffId), {
          fullName: formData.fullName,
          role: formData.role,
          classId: formData.classId || null,
          authorizedGrades: formData.authorizedGrades,
        }, { merge: true });
        alert('Data staf berhasil diperbaharui.');
      } else {
        // CREATE MODE
        const username = formData.email.split('@')[0];
        const newStaffId = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; 
        
        await setDoc(doc(db, 'users', newStaffId), {
          username,
          fullName: formData.fullName,
          role: formData.role,
          schoolId: profile?.schoolId,
          classId: formData.classId || null,
          authorizedGrades: formData.authorizedGrades,
          status: 'active',
          inviteEmail: formData.email.toLowerCase() 
        });
        alert('Staf berhasil diundang.');
      }
      
      setIsModalOpen(false);
      setEditingStaffId(null);
      setFormData({ email: '', fullName: '', role: 'tu', classId: '', authorizedGrades: [] });
    } catch (err: any) {
      console.error(err);
      alert('Gagal menambah staf: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeStaff = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', deleteId));
      setDeleteId(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(`Gagal menghapus: ${err.message || 'Periksa izin database'}`);
    } finally {
      setLoading(false);
    }
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
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800">{member.fullName}</h3>
                  {member.id.startsWith('staff_') ? (
                    <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 font-bold">UNDANGAN</span>
                  ) : (
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">AKTIF</span>
                  )}
                </div>
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">{member.role.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Mail size={14} /> <span className="truncate">{member.email || member.inviteEmail || member.username + '@school.com'}</span>
              </div>
              {member.authorizedGrades && member.authorizedGrades.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {member.authorizedGrades.map(g => (
                    <span key={g} className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                      KELAS {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {member.id !== profile?.id && member.role !== 'owner' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-slate-600 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wider"
                  onClick={() => {
                    setFormData({
                      email: member.email || member.inviteEmail || '',
                      fullName: member.fullName,
                      role: member.role,
                      classId: member.classId || '',
                      authorizedGrades: member.authorizedGrades || []
                    });
                    setEditingStaffId(member.id);
                    setIsModalOpen(true);
                  }}
                >
                  Edit Akses
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="px-3 border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200"
                  onClick={() => setDeleteId(member.id)}
                  title="Hapus / Cabut Akses"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Tip Manajemen:</strong> Jika ada staf dengan status <span className="font-bold underline text-amber-600">UNDANGAN</span> yang datanya sama dengan status <span className="font-bold underline text-emerald-600">AKTIF</span>, Anda bisa menghapus data "Undangan" tersebut agar daftar staf tetap rapi. Akun aktif adalah akun yang sudah berhasil login menggunakan Google/Belajar.id.
        </p>
      </div>

      {/* Modal Hapus Konfirmasi */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Konfirmasi Hapus">
        <div className="space-y-6">
          <p className="text-slate-600">
            Apakah Anda yakin ingin menghapus akses staf ini? Akun ini tidak akan bisa masuk lagi ke sistem sekolah Anda.
          </p>
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="outline" className="flex-1 bg-rose-600 text-white border-none hover:bg-rose-700" onClick={removeStaff} disabled={loading}>
              {loading ? 'Menghapus...' : 'Ya, Hapus Akses'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingStaffId(null);
          setFormData({ email: '', fullName: '', role: 'tu', classId: '', authorizedGrades: [] });
        }} 
        title={editingStaffId ? "Edit Wewenang Staf" : "Undang Staf Baru"}
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          {!editingStaffId && (
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">Alamat Email (Wajib Google / Belajar.id)</label>
              <Input 
                type="email"
                placeholder="nama.staf@guru.smp.belajar.id" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <p className="text-[10px] text-slate-400 mt-1 italic">Email ini akan digunakan staf untuk masuk via tombol "Masuk dengan Google".</p>
            </div>
          )}
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
          {formData.role === 'tu' && (
            <div>
              <label className="text-sm font-bold text-slate-700 mb-2 block">Wewenang Tingkat Kelas (Khusus TU)</label>
              <div className="flex gap-4">
                {['7', '8', '9'].map(grade => (
                  <label key={grade} className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl flex-1 hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-brand-teal rounded"
                      checked={formData.authorizedGrades.includes(grade)}
                      onChange={() => toggleGrade(grade)}
                    />
                    <span className="text-sm font-bold">Lvl {grade}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic font-medium">TU hanya bisa melihat siswa/kelas sesuai wewenang ini.</p>
            </div>
          )}
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
