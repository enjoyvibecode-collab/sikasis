export type UserRole = 'owner' | 'kepala_sekolah' | 'bendahara' | 'tu' | 'bendahara_kelas' | 'siswa';

export type TransactionType = 
  | 'TABUNGAN_SETOR' 
  | 'TABUNGAN_TARIK' 
  | 'KAS_KELAS_SETOR' 
  | 'KAS_KELAS_TARIK' 
  | 'MODAL_TU_MASUK' 
  | 'MODAL_TU_KEMBALI';

export interface School {
  id: string;
  name: string;
  address: string;
  status: 'pending' | 'active' | 'suspended';
  createdAt: any;
  ownerEmail: string;
  centralBalance: number; // Cash held by Bendahara
}

export interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  role: UserRole;
  schoolId: string;
  yearAssigned?: number; // For TU (7, 8, 9)
  status: 'active' | 'inactive';
}

export interface Class {
  id: string;
  schoolId: string;
  year: number;
  name: string;
  bendaharaKelasId?: string;
  balanceCash: number;
}

export interface TUWallet {
  id: string; // schoolId_TUuid
  schoolId: string;
  tuId: string;
  year: number;
  balance: number;
  lastUpdated: any;
}

export interface Student {
  id: string;
  schoolId: string;
  classId: string;
  nisn: string;
  fullName: string;
  balanceSavings: number;
}

export interface Transaction {
  id: string;
  schoolId: string;
  studentId?: string;
  classId?: string;
  tuId?: string;
  type: TransactionType;
  amount: number;
  executorId: string;
  timestamp: any;
  notes?: string;
  reversalOf?: string;
}
