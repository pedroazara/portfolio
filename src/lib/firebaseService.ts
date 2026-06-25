import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: "local_admin_pedro", // Using local admin authentication
      email: "PedroHenriqueAlmeida2004@gmail.com",
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Fetches the resume and portfolio data from Firestore.
 * Returns null if the document does not exist yet.
 */
export async function fetchResumeData(): Promise<ResumeData | null> {
  const fullPath = `${PORTFOLIO_DOC_PATH}/${PORTFOLIO_DOC_ID}`;
  try {
    const docRef = doc(db, PORTFOLIO_DOC_PATH, PORTFOLIO_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as ResumeData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, fullPath);
    return null;
  }
}

/**
 * Saves the entire resume and portfolio data to Firestore.
 */
export async function saveResumeData(data: ResumeData): Promise<void> {
  const fullPath = `${PORTFOLIO_DOC_PATH}/${PORTFOLIO_DOC_ID}`;
  try {
    const docRef = doc(db, PORTFOLIO_DOC_PATH, PORTFOLIO_DOC_ID);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, fullPath);
  }
}

/**
 * Fetches the admin password from Firestore or initializes it with the default if not present.
 */
export async function getAdminPassword(): Promise<string> {
  const fullPath = "portfolio_settings/security";
  try {
    const docRef = doc(db, "portfolio_settings", "security");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.password) {
        return data.password;
      }
    }
    
    // Auto-initialize the password with the user-defined value in Firestore if it doesn't exist
    const defaultPassword = "lHj1vZ4v6jBqpc";
    await setDoc(docRef, { password: defaultPassword }, { merge: true });
    return defaultPassword;
  } catch (error) {
    console.warn("Failed to fetch admin password from Firestore, using default fallback:", error);
    return "lHj1vZ4v6jBqpc";
  }
}

/**
 * Updates the admin password in Firestore.
 */
export async function updateAdminPassword(newPassword: string): Promise<void> {
  const fullPath = "portfolio_settings/security";
  try {
    const docRef = doc(db, "portfolio_settings", "security");
    await setDoc(docRef, { password: newPassword }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, fullPath);
  }
}


