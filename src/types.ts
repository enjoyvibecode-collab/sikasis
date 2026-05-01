export type UserRole = 'owner' | 'kepala_sekolah' | 'bendahara' | 'tu' | 'bendahara_kelas' | 'siswa';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolId: string;
  classId?: string; // For bendahara_kelas
  nisn?: string;    // For siswa
  authorizedGrades?: string[]; // e.g. ['7'], ['8'], ['9'] for TU staff
  createdAt: string;
}

export type TransactionType = 
  | 'SETOR_TABUNGAN' 
  | 'TARIK_TABUNGAN' 
  | 'SETOR_KAS_KELAS' 
  | 'TARIK_KAS_KELAS' 
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
  id: string; // Document ID
  uid: string;
  username: string;
  fullName: string;
  role: UserRole;
  schoolId: string;
  yearAssigned?: number;
  status: 'active' | 'inactive';
  inviteEmail?: string | null;
  classId?: string;
}

export interface ClassData {
  id: string;
  schoolId: string;
  name: string;
  balanceCash: number;
  status?: string;
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
  whatsappStudent?: string;
  whatsappParent?: string;
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
