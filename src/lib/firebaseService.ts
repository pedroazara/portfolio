import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { ResumeData } from "../types";

const PORTFOLIO_DOC_PATH = "portfolio_data";
const PORTFOLIO_DOC_ID = "main";

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const user = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid ?? null,
      email: user?.email ?? null,
      emailVerified: user?.emailVerified ?? null,
      isAnonymous: user?.isAnonymous ?? null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Busca os dados do currículo/portfólio no Firestore.
 * Retorna null se o documento ainda não existir.
 * Lança o erro original se a leitura falhar (offline, permissão negada, etc.),
 * para que a aplicação distinga "sem dados" de "não consegui ler".
 */
export async function fetchResumeData(): Promise<ResumeData | null> {
  const docRef = doc(db, PORTFOLIO_DOC_PATH, PORTFOLIO_DOC_ID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as ResumeData;
  }
  return null;
}

/**
 * Helper function to recursively remove undefined properties from objects
 * before sending them to Firestore, preventing payload rejection.
 */
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = (obj as any)[key];
        if (val !== undefined) {
          cleaned[key] = cleanUndefined(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Salva todo o currículo/portfólio no Firestore.
 * Lança o erro se a gravação falhar, para que a interface avise em vez de
 * fingir que o salvamento deu certo.
 */
export async function saveResumeData(data: ResumeData): Promise<void> {
  const docRef = doc(db, PORTFOLIO_DOC_PATH, PORTFOLIO_DOC_ID);
  const cleanedData = cleanUndefined(data);
  await setDoc(docRef, cleanedData, { merge: true });
}
