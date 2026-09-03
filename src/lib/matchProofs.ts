import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { compressScreenshot } from '../utils/imageCompressor';

const PROOFS_COLLECTION = 'match_proofs';
const LOCAL_PROOF_PREFIX = 'efootball_proof_';
const LOCAL_PROOF_INDEX_KEY = 'efootball_proof_keys_index';
const MAX_LOCAL_CACHED_PROOFS = 20; // Keep at most 20 recent proofs locally (~160KB total)

/**
 * Manages LRU eviction in localStorage to guarantee no storage quota errors ever occur on client devices
 */
function recordProofAccessInLocalStorage(matchId: string, proofData?: string): void {
  try {
    let keys: string[] = [];
    const rawKeys = localStorage.getItem(LOCAL_PROOF_INDEX_KEY);
    if (rawKeys) {
      try {
        keys = JSON.parse(rawKeys);
      } catch {
        keys = [];
      }
    }

    // Filter out current key and re-insert at end (most recently used)
    keys = keys.filter((k) => k !== matchId);

    if (proofData) {
      keys.push(matchId);

      // Evict oldest items if exceeding capacity
      while (keys.length > MAX_LOCAL_CACHED_PROOFS) {
        const oldest = keys.shift();
        if (oldest) {
          localStorage.removeItem(`${LOCAL_PROOF_PREFIX}${oldest}`);
        }
      }

      localStorage.setItem(`${LOCAL_PROOF_PREFIX}${matchId}`, proofData);
      localStorage.setItem(LOCAL_PROOF_INDEX_KEY, JSON.stringify(keys));
    } else {
      localStorage.removeItem(`${LOCAL_PROOF_PREFIX}${matchId}`);
      localStorage.setItem(LOCAL_PROOF_INDEX_KEY, JSON.stringify(keys));
    }
  } catch (err) {
    // If QuotaExceededError happens, purge all old proof keys safely
    try {
      const rawKeys = localStorage.getItem(LOCAL_PROOF_INDEX_KEY);
      if (rawKeys) {
        const keys: string[] = JSON.parse(rawKeys);
        keys.forEach((k) => localStorage.removeItem(`${LOCAL_PROOF_PREFIX}${k}`));
      }
      localStorage.removeItem(LOCAL_PROOF_INDEX_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Interface representing a match proof document in Firestore subcollection/root collection
 */
export interface MatchProofRecord {
  matchId: string;
  screenshotUrl: string | null;
  uploadedAt: string;
  updatedAt: string;
}

/**
 * In-memory LRU / Session cache for match screenshot proofs
 */
const proofMemoryCache = new Map<string, string | null>();

/**
 * Saves or updates a match screenshot proof in its dedicated Firestore document:
 * /match_proofs/{matchId}
 * and caches it in localStorage and memory.
 */
export async function saveMatchProof(
  matchId: string,
  rawScreenshotUrl: string | undefined | null
): Promise<string | null> {
  if (!matchId) return null;

  if (!rawScreenshotUrl) {
    // Delete/Remove screenshot
    proofMemoryCache.set(matchId, null);
    recordProofAccessInLocalStorage(matchId);

    if (db && isFirebaseConfigured) {
      try {
        const proofDocRef = doc(db, PROOFS_COLLECTION, matchId);
        await deleteDoc(proofDocRef);
      } catch (err) {
        console.warn(`Could not delete proof doc for match ${matchId} in cloud:`, err);
      }
    }
    return null;
  }

  // Optimize screenshot to compact ~8KB footprint before storing
  let optimizedScreenshot = rawScreenshotUrl;
  try {
    optimizedScreenshot = await compressScreenshot(rawScreenshotUrl);
  } catch {
    // Fallback to original if already small or compression fails
  }

  // 1. Update memory cache
  proofMemoryCache.set(matchId, optimizedScreenshot);

  // 2. Cache locally with LRU boundary
  recordProofAccessInLocalStorage(matchId, optimizedScreenshot);

  // 3. Persist into dedicated Firestore document: match_proofs/{matchId}
  if (db && isFirebaseConfigured) {
    try {
      const proofDocRef = doc(db, PROOFS_COLLECTION, matchId);
      const payload: MatchProofRecord = {
        matchId,
        screenshotUrl: optimizedScreenshot,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(proofDocRef, payload, { merge: true });
    } catch (cloudErr) {
      console.warn(`Could not persist proof doc to Firestore for match ${matchId}:`, cloudErr);
    }
  }

  return optimizedScreenshot;
}

/**
 * Fetches a match screenshot proof on demand.
 * 1. Checks memory cache
 * 2. Checks localStorage
 * 3. Fetches from Firestore dedicated collection /match_proofs/{matchId}
 */
export async function fetchMatchProof(matchId: string): Promise<string | null> {
  if (!matchId) return null;

  // 1. Memory check
  if (proofMemoryCache.has(matchId)) {
    return proofMemoryCache.get(matchId) || null;
  }

  // 2. LocalStorage check
  try {
    const local = localStorage.getItem(`${LOCAL_PROOF_PREFIX}${matchId}`);
    if (local) {
      proofMemoryCache.set(matchId, local);
      return local;
    }
  } catch {
    // Ignore storage issues
  }

  // 3. Cloud fetch
  if (db && isFirebaseConfigured) {
    try {
      const proofDocRef = doc(db, PROOFS_COLLECTION, matchId);
      const snap = await getDoc(proofDocRef);
      if (snap.exists()) {
        const data = snap.data() as MatchProofRecord;
        const url = data.screenshotUrl || null;
        proofMemoryCache.set(matchId, url);
        if (url) {
          recordProofAccessInLocalStorage(matchId, url);
        }
        return url;
      }
    } catch (err) {
      console.warn(`Could not load match proof from cloud for ${matchId}:`, err);
    }
  }

  proofMemoryCache.set(matchId, null);
  return null;
}

/**
 * Subscribes to real-time changes for a specific match proof (when viewing match detail)
 */
export function subscribeToMatchProof(
  matchId: string,
  onData: (screenshotUrl: string | null) => void
): () => void {
  if (!matchId) return () => {};

  // Immediately notify with cached value if available
  if (proofMemoryCache.has(matchId)) {
    onData(proofMemoryCache.get(matchId) || null);
  } else {
    try {
      const local = localStorage.getItem(`${LOCAL_PROOF_PREFIX}${matchId}`);
      if (local) {
        proofMemoryCache.set(matchId, local);
        onData(local);
      }
    } catch {
      // Ignore
    }
  }

  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  try {
    const proofDocRef = doc(db, PROOFS_COLLECTION, matchId);
    const unsubscribe = onSnapshot(
      proofDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as MatchProofRecord;
          const url = data.screenshotUrl || null;
          proofMemoryCache.set(matchId, url);
          onData(url);
        } else {
          proofMemoryCache.set(matchId, null);
          onData(null);
        }
      },
      (err) => {
        console.warn(`Proof subscription error for ${matchId}:`, err);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Synchronously retrieves cached proof from memory or localStorage if available
 */
export function getCachedMatchProof(matchId: string): string | null {
  if (!matchId) return null;
  if (proofMemoryCache.has(matchId)) {
    return proofMemoryCache.get(matchId) || null;
  }
  try {
    const local = localStorage.getItem(`${LOCAL_PROOF_PREFIX}${matchId}`);
    if (local) {
      proofMemoryCache.set(matchId, local);
      return local;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Fetches all available match proofs in a single batch read (used by Admin Dashboard)
 */
export async function fetchAllMatchProofs(): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // Fill from memory cache
  for (const [id, url] of proofMemoryCache.entries()) {
    if (url) result.set(id, url);
  }

  // Check localStorage index
  try {
    const rawKeys = localStorage.getItem(LOCAL_PROOF_INDEX_KEY);
    if (rawKeys) {
      const keys: string[] = JSON.parse(rawKeys);
      for (const k of keys) {
        if (!result.has(k)) {
          const localVal = localStorage.getItem(`${LOCAL_PROOF_PREFIX}${k}`);
          if (localVal) {
            result.set(k, localVal);
            proofMemoryCache.set(k, localVal);
          }
        }
      }
    }
  } catch {
    // Ignore
  }

  if (!db || !isFirebaseConfigured) {
    return result;
  }

  try {
    const proofsColRef = collection(db, PROOFS_COLLECTION);
    const snap = await getDocs(proofsColRef);
    snap.docs.forEach((d) => {
      const data = d.data() as MatchProofRecord;
      if (data && data.screenshotUrl) {
        result.set(d.id, data.screenshotUrl);
        proofMemoryCache.set(d.id, data.screenshotUrl);
      }
    });
  } catch (err) {
    console.warn('Could not fetch all proofs collection:', err);
  }

  return result;
}

/**
 * Subscribes to real-time changes across the entire match proofs collection
 * Ensures Admin Dashboard updates instantly whenever an audit screenshot is uploaded or edited
 */
export function subscribeToAllMatchProofs(
  onUpdate: (proofsMap: Map<string, string>) => void
): () => void {
  // Prepopulate from cache
  const initialMap = new Map<string, string>();
  for (const [id, url] of proofMemoryCache.entries()) {
    if (url) initialMap.set(id, url);
  }
  try {
    const rawKeys = localStorage.getItem(LOCAL_PROOF_INDEX_KEY);
    if (rawKeys) {
      const keys: string[] = JSON.parse(rawKeys);
      for (const k of keys) {
        if (!initialMap.has(k)) {
          const localVal = localStorage.getItem(`${LOCAL_PROOF_PREFIX}${k}`);
          if (localVal) {
            initialMap.set(k, localVal);
            proofMemoryCache.set(k, localVal);
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  onUpdate(new Map(initialMap));

  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  try {
    const proofsColRef = collection(db, PROOFS_COLLECTION);
    const unsubscribe = onSnapshot(
      proofsColRef,
      (snapshot) => {
        const nextMap = new Map<string, string>();
        snapshot.docs.forEach((d) => {
          const data = d.data() as MatchProofRecord;
          if (data && data.screenshotUrl) {
            nextMap.set(d.id, data.screenshotUrl);
            proofMemoryCache.set(d.id, data.screenshotUrl);
          } else {
            proofMemoryCache.set(d.id, null);
          }
        });
        onUpdate(nextMap);
      },
      (err) => {
        console.warn('Realtime subscription error for match_proofs collection:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to listen to match_proofs collection:', err);
    return () => {};
  }
}
