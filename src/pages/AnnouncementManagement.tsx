import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal } from '../components/UI';
import { Megaphone, Trash2, Plus, Calendar } from 'lucide-react';

export default function AnnouncementManagement() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    if (!profile?.schoolId) return;
    const q = query(
      collection(db, 'announcements'),
      where('schoolId', '==', profile.schoolId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [profile?.schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        ...formData,
        schoolId: profile.schoolId,
        authorId: profile.id,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({ title: '', content: '' });
    } catch (err) {
      console.error(err);
      alert('Gagal membuat pengumuman');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    try {
       await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-brand-sand">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Daftar Pengumuman</h2>
          <p className="text-xs text-slate-500">Muncul di halaman cek saldo siswa & ortu.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={18} /> Buat Baru
        </Button>
      </div>

      <div className="grid gap-4">
        {announcements.map(ann => (
          <Card key={ann.id} className="p-6 relative group overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-sand text-brand-teal rounded-xl flex items-center justify-center">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{ann.title}</h4>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-bold tracking-wider">
                    <Calendar size={10} /> {ann.createdAt?.toDate?.().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(ann.id)}
                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{ann.content}</p>
          </Card>
        ))}
        {announcements.length === 0 && (
          <div className="py-20 text-center opacity-30 italic bg-white rounded-3xl border-2 border-dashed border-brand-sand">
            Belum ada pengumuman yang dibuat.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Pengumuman Baru">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Judul Pengumuman</label>
            <Input 
              placeholder="Contoh: Jadwal Pengambilan Tabungan" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Isi Pengumuman</label>
            <textarea 
              rows={4}
              className="w-full p-4 rounded-2xl border border-brand-sand focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none transition-all text-sm"
              placeholder="Tuliskan detail pengumuman di sini..."
              required
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
            />
          </div>
          <Button className="w-full h-12 shadow-lg shadow-brand-teal/20" disabled={loading}>
            {loading ? 'Mengirim...' : 'Publikasikan Sekarang'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
