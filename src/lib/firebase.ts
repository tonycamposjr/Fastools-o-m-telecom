/**
 * Firebase unificado — Central de Campo (Rede & OTDR)
 *
 * Um único app Firebase (projeto integral-blend-p6rpq) com DOIS bancos Firestore:
 *  - dbRede : dados do sistema de ferramentas de rede (clientes, TA, rotas HL4)
 *  - dbOtdr : dados do leitor OTDR (configurações e traços na nuvem)
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const REDE_DB_ID = 'ai-studio-sistemaunificado-e92457df-f5f5-4dae-bf01-2d93c76dd572';
export const OTDR_DB_ID = 'ai-studio-5981eb96-74a5-49bf-80a6-b310d23f0248';

const firebaseConfig = {
  projectId: 'integral-blend-p6rpq',
  appId: '1:245634302066:web:2c3b789867f72859ebc2eb',
  apiKey: 'AIzaSyAdTDpmAxtfMlnKlnhfBWOspWSOcX_td_g',
  authDomain: 'integral-blend-p6rpq.firebaseapp.com',
  storageBucket: 'integral-blend-p6rpq.firebasestorage.app',
  messagingSenderId: '245634302066',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const dbRede = getFirestore(app, REDE_DB_ID);
export const dbOtdr = getFirestore(app, OTDR_DB_ID);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Registra um erro de Firestore com contexto estruturado.
 * Não lança exceção — os fluxos de UI continuam funcionando em modo local.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Validação de conexão em segundo plano (silenciosa)
async function testConnection() {
  try {
    await getDocFromServer(doc(dbRede, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase offline — recursos locais continuam ativos.');
    }
  }
}
testConnection();

// ---------------------------------------------------------------------------
// Helpers do módulo OTDR (configurações e traços na nuvem)
// ---------------------------------------------------------------------------

export async function getUserSettings(userId: string) {
  const path = `users/${userId}/settings/current`;
  try {
    const snap = await getDoc(doc(dbOtdr, 'users', userId, 'settings', 'current'));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function saveUserSettings(userId: string, settings: any) {
  const path = `users/${userId}/settings/current`;
  try {
    await setDoc(doc(dbOtdr, 'users', userId, 'settings', 'current'), {
      userId: userId,
      mediumLoss: Number(settings.mediumLoss ?? 0.4),
      highLoss: Number(settings.highLoss ?? 1.0),
      reflectLimit: Number(settings.reflectLimit ?? -40),
      traceTheme: String(settings.traceTheme || 'orange-black'),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveTraceToCloud(userId: string, traceId: string, traceData: any) {
  const path = `users/${userId}/traces/${traceId}`;
  try {
    // Sanitiza eventos para remover valores undefined
    const cleanEvents = (traceData.events || []).map((e: any) => ({
      eventNumber: Number(e.eventNumber ?? 0),
      distanceKm: Number(e.distanceKm ?? 0),
      slopeDbKm: Number(e.slopeDbKm ?? 0),
      spliceLossDb: Number(e.spliceLossDb ?? 0),
      reflectanceDb: e.reflectanceDb != null ? Number(e.reflectanceDb) : null,
      eventType: String(e.eventType || 'desconhecido'),
      comment: String(e.comment || ''),
      isEnd: Boolean(e.isEnd),
    }));

    // Sanitiza pontos da curva para remover valores undefined
    const cleanCurve = (traceData.curvePoints || []).map((p: any) => ({
      distanceKm: Number(p.distanceKm ?? 0),
      valueDb: Number(p.valueDb ?? 0),
    }));

    const cleanPayload: Record<string, any> = {
      id: String(traceId),
      ownerId: String(userId),
      fileName: String(traceData.fileName || 'traco.sor'),
      fileSize: Number(traceData.fileSize || 0),
      testDate: String(traceData.testDate || new Date().toISOString()),
      wavelengthNm: Number(traceData.wavelengthNm || 0),
      pulseWidthNs: Number(traceData.pulseWidthNs || 0),
      ior: Number(traceData.ior || 1.468),
      fiberLengthKm: Number(traceData.fiberLengthKm || 0),
      acquisitionRangeKm: Number(traceData.acquisitionRangeKm || 0),
      fiberType: String(traceData.fiberType || ''),
      cableId: String(traceData.cableId || ''),
      fiberId: String(traceData.fiberId || ''),
      dataPoints: Number(traceData.dataPoints || 0),
      spacingM: Number(traceData.spacingM || 0),
      backscatterDb: Number(traceData.backscatterDb || 0),
      traceType: String(traceData.traceType || ''),
      orlDb: Number(traceData.orlDb || 0),
      totalLossDb: Number(traceData.totalLossDb || 0),
      events: cleanEvents,
      curvePoints: cleanCurve,
      uploadedAt: serverTimestamp(),
    };

    await setDoc(doc(dbOtdr, 'users', userId, 'traces', traceId), cleanPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

export async function getCloudTraces(userId: string) {
  const path = `users/${userId}/traces`;
  try {
    const q = query(collection(dbOtdr, 'users', userId, 'traces'));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function deleteCloudTrace(userId: string, traceId: string) {
  const path = `users/${userId}/traces/${traceId}`;
  try {
    await deleteDoc(doc(dbOtdr, 'users', userId, 'traces', traceId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}
