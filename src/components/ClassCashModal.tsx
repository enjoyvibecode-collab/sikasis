import React, { useState } from 'react';
import { executeAtomicTransaction, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Modal, Button, Input } from './UI';
import { Plus, Minus, AlertCircle } from 'lucide-react';
import { ClassData } from '../types';

interface ClassCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: ClassData | null;
}

export const ClassCashModal: React.FC<ClassCashModalProps> = ({ 
  isOpen, 
  onClose, 
  classData 
}) => {
  const { profile } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'SETOR_KAS_KELAS' | 'TARIK_KAS_KELAS'>('SETOR_KAS_KELAS');
  const [loading, setLoading] = useState(false);

  if (!classData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Masukkan jumlah yang valid (lebih dari 0)');
      return;
    }

    if (type === 'TARIK_KAS_KELAS' && numAmount > classData.balanceCash) {
      alert('Saldo kas tidak mencukupi untuk penarikan ini.');
      return;
    }

    setLoading(true);

    try {
      await executeAtomicTransaction({
        schoolId: classData.schoolId,
        classId: classData.id,
        entityName: classData.name,
        amount: numAmount,
        type: type,
        notes: type === 'SETOR_KAS_KELAS' ? `Tambah kas kelas ${classData.name}` : `Tarik kas kelas ${classData.name}`
      });

      setAmount('');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'Class Cash Transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={type === 'SETOR_KAS_KELAS' ? 'Setor Kas Kelas' : 'Tarik Kas Kelas'}
    >
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Kelas</p>
          <h4 className="font-bold text-slate-800">{classData.name}</h4>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
            <span className="text-sm text-slate-500 font-medium">Saldo Kas Saat Ini</span>
            <span className="font-display font-bold text-brand-teal">Rp {classData.balanceCash.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-brand-sand/50 rounded-xl">
          <button
            onClick={() => setType('SETOR_KAS_KELAS')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              type === 'SETOR_KAS_KELAS' 
                ? 'bg-brand-teal text-white shadow-md' 
                : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            <Plus size={16} /> Setor
          </button>
          <button
            onClick={() => setType('TARIK_KAS_KELAS')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              type === 'TARIK_KAS_KELAS' 
                ? 'bg-rose-500 text-white shadow-md' 
                : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            <Minus size={16} /> Tarik
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah Nominal (Rp)</label>
            <Input
              type="number"
              placeholder="Contoh: 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {type === 'TARIK_KAS_KELAS' && classData.balanceCash < (parseInt(amount) || 0) && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-3 rounded-xl">
              <AlertCircle size={18} />
              <p className="text-xs font-bold uppercase">Saldo Kas Tidak Mencukupi</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose} 
              className="flex-1"
              disabled={loading}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              className={`flex-1 ${type === 'TARIK_KAS_KELAS' ? 'bg-rose-500 hover:bg-rose-600' : ''}`}
              disabled={loading || (type === 'TARIK_KAS_KELAS' && (parseInt(amount) || 0) > classData.balanceCash)}
            >
              {loading ? 'Memproses...' : 'Konfirmasi'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
