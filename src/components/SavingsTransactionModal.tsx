import React, { useState } from 'react';
import { executeAtomicTransaction, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Modal, Button, Input } from './UI';
import { Plus, Minus, AlertCircle } from 'lucide-react';

interface SavingsTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    fullName: string;
    balanceSavings: number;
    schoolId: string;
    nisn: string;
  } | null;
}

export const SavingsTransactionModal: React.FC<SavingsTransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  student 
}) => {
  const { profile } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'SETOR_TABUNGAN' | 'TARIK_TABUNGAN'>('SETOR_TABUNGAN');
  const [loading, setLoading] = useState(false);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Masukkan jumlah yang valid (lebih dari 0)');
      return;
    }

    if (type === 'TARIK_TABUNGAN' && numAmount > student.balanceSavings) {
      alert('Saldo tidak mencukupi untuk penarikan ini.');
      return;
    }

    setLoading(true);

    try {
      await executeAtomicTransaction({
        schoolId: student.schoolId,
        studentId: student.id,
        entityName: student.fullName,
        amount: numAmount,
        type: type,
        notes: type === 'SETOR_TABUNGAN' ? 'Setoran tabungan mandiri' : 'Penarikan tabungan mandiri'
      });

      setAmount('');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'Savings Transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={type === 'SETOR_TABUNGAN' ? 'Setor Tabungan' : 'Tarik Tabungan'}
    >
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Siswa</p>
          <h4 className="font-bold text-slate-800">{student.fullName}</h4>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
            <span className="text-sm text-slate-500 font-medium">Saldo Saat Ini</span>
            <span className="font-display font-bold text-brand-teal">Rp {student.balanceSavings.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-brand-sand/50 rounded-xl">
          <button
            onClick={() => setType('SETOR_TABUNGAN')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              type === 'SETOR_TABUNGAN' 
                ? 'bg-brand-teal text-white shadow-md' 
                : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            <Plus size={16} /> Setor
          </button>
          <button
            onClick={() => setType('TARIK_TABUNGAN')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              type === 'TARIK_TABUNGAN' 
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
              placeholder="Contoh: 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {type === 'TARIK_TABUNGAN' && student.balanceSavings < (parseInt(amount) || 0) && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-3 rounded-xl">
              <AlertCircle size={18} />
              <p className="text-xs font-bold uppercase">Saldo Tidak Mencukupi</p>
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
              className={`flex-1 ${type === 'TARIK_TABUNGAN' ? 'bg-rose-500 hover:bg-rose-600' : ''}`}
              disabled={loading || (type === 'TARIK_TABUNGAN' && (parseInt(amount) || 0) > student.balanceSavings)}
            >
              {loading ? 'Memproses...' : 'Konfirmasi'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
