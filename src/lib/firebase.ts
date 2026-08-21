import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  setLogLevel,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Prevent noisy unhandled network warnings in developer console
try {
  setLogLevel('silent');
} catch {
  // Ignore if not supported in current environment
}

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  !String(import.meta.env.VITE_FIREBASE_API_KEY).includes('your_') &&
  !String(import.meta.env.VITE_FIREBASE_PROJECT_ID).includes('your_')
);

const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || '';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
  authDomain:
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) ||
    (projectId ? `${projectId}.firebaseapp.com` : ''),
  projectId: projectId,
  storageBucket:
    (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) ||
    (projectId ? `${projectId}.firebasestorage.app` : ''),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '',
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || '',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);

    const rawDbId = (firebaseConfig.firestoreDatabaseId || '').trim();
    // Validate if rawDbId is a genuine named Firestore database ID
    // Exclude default aliases '(default)', Google Analytics measurement IDs ('G-...'), or invalid formats
    const isCustomNamedDb =
      rawDbId &&
      rawDbId !== '(default)' &&
      !rawDbId.startsWith('G-') &&
      !rawDbId.includes(':') &&
      /^[a-z0-9]([a-z0-9-]{2,61}[a-z0-9])?$/i.test(rawDbId);

    if (isCustomNamedDb) {
      try {
        db = getFirestore(app, rawDbId);
      } catch (namedDbErr) {
        console.warn(
          `Named Firestore database "${rawDbId}" failed to initialize, falling back to default database:`,
          namedDbErr
        );
        db = getFirestore(app);
      }
    } else {
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn('Firebase initialization error:', err);
  }
}

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentAuthUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuthUser?.uid,
      email: currentAuthUser?.email,
      emailVerified: currentAuthUser?.emailVerified,
      isAnonymous: currentAuthUser?.isAnonymous,
      tenantId: currentAuthUser?.tenantId,
      providerInfo:
        currentAuthUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates active connection to Firestore backend from server
 */
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    const testDoc = doc(db, 'tournaments', 'efootball_premier_league_2026');
    await getDocFromServer(testDoc);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client operates in offline mode or waiting for connection.');
    } else {
      console.warn('Firestore connection check notice:', error);
    }
    return false;
  }
}

export { app, db, auth };



