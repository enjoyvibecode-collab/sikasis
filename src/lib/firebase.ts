import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  writeBatch, 
  collection, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { TransactionType } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity Test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: auth.currentUser?.uid, email: auth.currentUser?.email },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * ATOMIC TRANSACTION HELPERS
 * These ensure that a transaction record and balance update happen in one batch.
 * This is REQUIRED by our Security Rules (getAfter).
 */

interface TransactionPayload {
  schoolId: string;
  amount: number;
  type: TransactionType;
  studentId?: string;
  classId?: string;
  tuId?: string;
  entityName?: string;
  notes?: string;
}

export async function executeAtomicTransaction(payload: TransactionPayload) {
  const batch = writeBatch(db);
  const txRef = doc(collection(db, 'transactions'));
  const executorId = auth.currentUser?.uid;

  if (!executorId) throw new Error("User must be authenticated");

  // 1. Transaction Log
  batch.set(txRef, {
    ...payload,
    executorId,
    timestamp: serverTimestamp(),
  });

  // 2. Adjust Relevant Balances
  const walletId = `${payload.schoolId}_${payload.tuId || executorId}`;
  const walletRef = doc(db, 'tu_wallets', walletId);

  switch (payload.type) {
    case 'SETOR_TABUNGAN':
      if (!payload.studentId) throw new Error("Missing Student ID");
      batch.update(doc(db, 'students', payload.studentId), {
        balanceSavings: increment(payload.amount)
      });
      batch.set(walletRef, {
        balance: increment(payload.amount),
        lastUpdated: serverTimestamp(),
        schoolId: payload.schoolId,
        tuId: payload.tuId || executorId
      }, { merge: true });
      break;

    case 'TARIK_TABUNGAN':
      if (!payload.studentId) throw new Error("Missing Student ID");
      batch.update(doc(db, 'students', payload.studentId), {
        balanceSavings: increment(-payload.amount)
      });
      batch.set(walletRef, {
        balance: increment(-payload.amount),
        lastUpdated: serverTimestamp(),
        schoolId: payload.schoolId,
        tuId: payload.tuId || executorId
      }, { merge: true });
      break;

    case 'SETOR_KAS_KELAS':
      if (!payload.classId) throw new Error("Missing Class ID");
      batch.update(doc(db, 'classes', payload.classId), {
        balanceCash: increment(payload.amount)
      });
      batch.set(walletRef, {
        balance: increment(payload.amount),
        lastUpdated: serverTimestamp(),
        schoolId: payload.schoolId,
        tuId: payload.tuId || executorId
      }, { merge: true });
      break;

    case 'TARIK_KAS_KELAS':
      if (!payload.classId) throw new Error("Missing Class ID");
      batch.update(doc(db, 'classes', payload.classId), {
        balanceCash: increment(-payload.amount)
      });
      batch.set(walletRef, {
        balance: increment(-payload.amount),
        lastUpdated: serverTimestamp(),
        schoolId: payload.schoolId,
        tuId: payload.tuId || executorId
      }, { merge: true });
      break;

    case 'MODAL_TU_MASUK':
      batch.set(walletRef, {
        balance: increment(payload.amount),
        lastUpdated: serverTimestamp(),
        schoolId: payload.schoolId,
        tuId: payload.tuId || executorId
      }, { merge: true });
      batch.update(doc(db, 'schools', payload.schoolId), {
        centralBalance: increment(-payload.amount)
      });
      break;

    case 'MODAL_TU_KEMBALI':
      batch.set(walletRef, {
        balance: increment(-payload.amount),
        lastUpdated: serverTimestamp(),
        schoolId: payload.schoolId,
        tuId: payload.tuId || executorId
      }, { merge: true });
      batch.update(doc(db, 'schools', payload.schoolId), {
        centralBalance: increment(payload.amount)
      });
      break;
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'Atomic Batch Transaction');
  }
}
