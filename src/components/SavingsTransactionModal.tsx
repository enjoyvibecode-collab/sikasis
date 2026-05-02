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
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTx, setLastTx] = useState<any>(null);

  if (!student) return null;

  const handlePrint = () => {
    if (!lastTx) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body { width: 58mm; padding: 5mm; font-family: monospace; font-size: 11px; line-height: 1.2; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .flex { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">SIKASIS - STRUK</div>
          <div class="center">BUKTI TABUNGAN SISWA</div>
          <div class="divider"></div>
          <div>Nama: ${student.fullName}</div>
          <div>NISN: ${student.nisn}</div>
          <div>Tgl : ${new Date().toLocaleString('id-ID')}</div>
          <div>Opr : ${profile?.fullName}</div>
          <div class="divider"></div>
          <div class="flex bold">
            <span>${type === 'SETOR_TABUNGAN' ? 'SETOR' : 'TARIK'}</span>
            <span>Rp ${(lastTx.amount || 0).toLocaleString('id-ID')}</span>
          </div>
          <div class="divider"></div>
          <div class="center">Simpan bukti transaksi ini.</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

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

      setLastTx({ amount: numAmount, type });
      setShowSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'Savings Transaction');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setAmount('');
    setShowSuccess(false);
    setLastTx(null);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={resetAndClose} 
      title={showSuccess ? 'Transaksi Berhasil' : (type === 'SETOR_TABUNGAN' ? 'Setor Tabungan' : 'Tarik Tabungan')}
    >
      <div className="space-y-6">
        {showSuccess ? (
          <div className="py-8 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-100">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-10 h-10">
                 <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-800">Transaksi Berhasil!</h4>
              <p className="text-sm text-slate-500">Saldo tabungan siswa telah diperbarui.</p>
            </div>
            <div className="space-y-3">
              <Button onClick={handlePrint} className="w-full h-14 bg-slate-900 hover:bg-black gap-2 text-lg shadow-xl">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                   <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
                 </svg>
                 CETAK STRUK THERMAL
              </Button>
              <Button variant="secondary" onClick={resetAndClose} className="w-full">
                 Selesai & Tutup
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Siswa</p>
              <h4 className="font-bold text-slate-800">{student.fullName}</h4>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                <span className="text-sm text-slate-500 font-medium">Saldo Saat Ini</span>
                <span className="font-display font-bold text-brand-teal">Rp {(student.balanceSavings || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-brand-sand/50 rounded-xl">
              <button
                type="button"
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
                type="button"
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
          </>
        )}
      </div>
    </Modal>
  );
};
