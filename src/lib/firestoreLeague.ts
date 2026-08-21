import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { Team, Match, TournamentConfig } from '../types';
import { INITIAL_TEAMS, INITIAL_CONFIG } from '../data/initialData';
import { generateRoundRobinSchedule } from '../utils/scheduler';
import { StoredState, loadTournamentState, saveTournamentState } from '../utils/storage';
import { getTeamLogoUrl } from '../assets/teamLogos';
import { saveMatchProof } from './matchProofs';

const TOURNAMENT_COLLECTION = 'tournaments';
const TOURNAMENT_DOC_ID = 'efootball_premier_league_2026';
const TOURNAMENT_PATH = `${TOURNAMENT_COLLECTION}/${TOURNAMENT_DOC_ID}`;

export interface LeagueCloudState {
  teams: Team[];
  matches: Match[];
  config: TournamentConfig;
  byesPerRound: Record<number, string>;
  updatedAt?: string;
}

/**
 * Strips heavy embedded screenshot data from matches to keep the main tournament
 * document ultralight (~60KB for all 420 matches!), while storing proofs in dedicated records.
 */
export function stripScreenshotsFromMatches(matches: Match[]): Match[] {
  return matches.map((m) => {
    if (m.screenshotUrl) {
      const { screenshotUrl, ...rest } = m;
      return rest as Match;
    }
    return m;
  });
}

/**
 * Creates default initial state if none exists in Firestore
 */
export function createDefaultLeagueState(): StoredState {
  const teams = [...INITIAL_TEAMS];
  const isDouble = INITIAL_CONFIG.format === 'double_round_robin';
  const { matches, byesPerRound } = generateRoundRobinSchedule(teams, isDouble);
  const totalRounds = isDouble
    ? teams.length % 2 === 0
      ? (teams.length - 1) * 2
      : teams.length * 2
    : teams.length % 2 === 0
    ? teams.length - 1
    : teams.length;

  return {
    teams,
    matches,
    config: {
      ...INITIAL_CONFIG,
      totalRounds,
    },
    byesPerRound,
  };
}

/**
 * Removes any undefined fields to prevent Firestore serialization rejection:
 * 'Unsupported field value: undefined'
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Subscribes to real-time changes of the entire league from Firestore.
 * Automatically bootstraps initial state if the cloud document is empty.
 * If Firebase is not configured or backend is unavailable, gracefully falls back to local storage.
 */
export function subscribeToLeagueState(
  onData: (state: StoredState) => void,
  onError?: (error: Error) => void
): () => void {
  // If Firestore is not initialized/configured, immediately provide cached local state
  if (!db || !isFirebaseConfigured) {
    const local = loadTournamentState();
    const fallbackState = local && local.teams?.length > 0 ? local : createDefaultLeagueState();
    onData(fallbackState);
    return () => {};
  }

  const docRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC_ID);

  try {
    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as LeagueCloudState;

          // Merge official team logos/colors to preserve vector assets
          const initialMap = new Map<string, Team>();
          INITIAL_TEAMS.forEach((t) => {
            initialMap.set(t.id, t);
            initialMap.set(t.clubName.toLowerCase(), t);
          });

          const updatedTeams = (data.teams || []).map((t) => {
            const matching = initialMap.get(t.id) || initialMap.get(t.clubName.toLowerCase());
            const localVectorLogo = getTeamLogoUrl(t.id, t.clubName);
            if (matching) {
              return {
                ...t,
                logo: localVectorLogo || matching.logo || t.logo,
                color: matching.color || t.color,
                secondaryColor: matching.secondaryColor || t.secondaryColor,
              };
            }
            return {
              ...t,
              logo: localVectorLogo || t.logo,
            };
          });

          const state: StoredState = {
            teams: updatedTeams,
            matches: data.matches || [],
            config: data.config || INITIAL_CONFIG,
            byesPerRound: data.byesPerRound || {},
          };

          // Also cache locally for seamless offline fallback
          saveTournamentState(state);
          onData(state);
        } else {
          // Document does not exist in Firestore yet -> Bootstrap it
          const local = loadTournamentState();
          const stateToUpload: StoredState = local && local.teams?.length > 0 ? local : createDefaultLeagueState();

          try {
            const cleanPayload = sanitizeForFirestore({
              teams: stateToUpload.teams,
              matches: stripScreenshotsFromMatches(stateToUpload.matches),
              config: stateToUpload.config,
              byesPerRound: stateToUpload.byesPerRound,
              updatedAt: new Date().toISOString(),
            });
            await setDoc(docRef, cleanPayload);
            onData(stateToUpload);
          } catch (initErr) {
            console.warn('Could not bootstrap cloud state immediately:', initErr);
            onData(stateToUpload);
            if (onError && initErr instanceof Error) {
              onError(initErr);
            }
          }
        }
      },
      (err) => {
        console.warn('Firestore subscription notice:', err.message || err);
        const local = loadTournamentState();
        const fallback = local && local.teams?.length > 0 ? local : createDefaultLeagueState();
        onData(fallback);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error initiating Firestore snapshot listener:', err);
    const local = loadTournamentState();
    const fallback = local && local.teams?.length > 0 ? local : createDefaultLeagueState();
    onData(fallback);
    return () => {};
  }
}

/**
 * Updates a single match result in Firestore (instant real-time broadcast to all devices)
 */
export async function updateMatchInCloud(
  updatedMatch: Match,
  currentMatches: Match[]
): Promise<void> {
  // If match has a screenshot attached, offload it into the dedicated match_proofs collection
  if (updatedMatch.screenshotUrl) {
    saveMatchProof(updatedMatch.id, updatedMatch.screenshotUrl).catch((err) => {
      console.warn('Error persisting match proof:', err);
    });
  }

  // Keep match payload lightweight in the main document
  const { screenshotUrl, ...cleanMatch } = updatedMatch;

  const newMatches = currentMatches.map((m) =>
    m.id === updatedMatch.id ? (cleanMatch as Match) : m
  );

  const strippedMatches = stripScreenshotsFromMatches(newMatches);

  if (!db || !isFirebaseConfigured) return;

  try {
    const docRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC_ID);
    const cleanPayload = sanitizeForFirestore({
      matches: strippedMatches,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err) {
    console.warn('Firestore updateMatchInCloud error:', err);
    try {
      handleFirestoreError(err, OperationType.UPDATE, TOURNAMENT_PATH);
    } catch {
      // Allow caller to proceed with local state
    }
  }
}

/**
 * Updates match screenshot in Firestore dedicated proof collection
 */
export async function updateMatchScreenshotInCloud(
  matchId: string,
  screenshotUrl: string | undefined,
  currentMatches: Match[]
): Promise<void> {
  // Save into decoupled match_proofs collection
  await saveMatchProof(matchId, screenshotUrl || null);

  // Also maintain clean status in main document if needed
  if (!db || !isFirebaseConfigured) return;

  try {
    const strippedMatches = stripScreenshotsFromMatches(currentMatches);
    const docRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC_ID);
    const cleanPayload = sanitizeForFirestore({
      matches: strippedMatches,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err) {
    console.warn('Firestore updateMatchScreenshotInCloud notice:', err);
  }
}

/**
 * Saves entire league state to Firestore (e.g. config update or schedule reset)
 */
export async function saveLeagueStateToCloud(state: StoredState): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const docRef = doc(db, TOURNAMENT_COLLECTION, TOURNAMENT_DOC_ID);
    const cleanPayload = sanitizeForFirestore({
      teams: state.teams,
      matches: stripScreenshotsFromMatches(state.matches),
      config: state.config,
      byesPerRound: state.byesPerRound,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err) {
    console.warn('Firestore saveLeagueStateToCloud error:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, TOURNAMENT_PATH);
    } catch {
      // Allow caller to proceed with local state
    }
  }
}

