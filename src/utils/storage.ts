import { Team, Match, TournamentConfig } from '../types';
import { INITIAL_TEAMS, INITIAL_CONFIG } from '../data/initialData';
import {
  generateRoundRobinSchedule,
  reorganizeUnplayedSecondLegAsymmetric,
  squeezeFirstLegAndCleanSecondLeg,
} from './scheduler';

const STORAGE_KEYS = {
  TEAMS: 'efootball_league_premier_v2_teams',
  MATCHES: 'efootball_league_premier_v2_matches',
  CONFIG: 'efootball_league_premier_v2_config',
  BYES: 'efootball_league_premier_v2_byes',
};

export interface StoredState {
  teams: Team[];
  matches: Match[];
  config: TournamentConfig;
  byesPerRound: Record<number, string>;
}

/**
 * Ensures that all matches in the 2nd leg phase (return fixtures, round > numLeg1Rounds)
 * are strictly scheduled with null scores when no 2nd leg matches have been played yet.
 */
export function ensureSecondLegMatchesUnplayed(
  matches: Match[],
  teams: Team[],
  format: string = 'double_round_robin'
): { matches: Match[]; modified: boolean } {
  if (format !== 'double_round_robin') {
    return { matches, modified: false };
  }

  const isOdd = teams.length % 2 !== 0;
  const numTeams = isOdd ? teams.length + 1 : teams.length;
  const numLeg1Rounds = numTeams - 1; // 19 rounds for 20 teams

  let modified = false;
  const sanitizedMatches = matches.map((m) => {
    if (m.round > numLeg1Rounds) {
      if (
        m.status !== 'scheduled' ||
        m.homeScore !== null ||
        m.awayScore !== null ||
        m.playedAt !== undefined ||
        m.submittedAt !== undefined ||
        (m.goals && m.goals.length > 0)
      ) {
        modified = true;
        return {
          ...m,
          status: 'scheduled' as const,
          homeScore: null,
          awayScore: null,
          playedAt: undefined,
          submittedAt: undefined,
          submittedBy: undefined,
          goals: [],
          notes: undefined,
          screenshotUrl: undefined,
          auditApproved: false,
          approvedBy: undefined,
          approvedAt: undefined,
          approvalNotes: undefined,
        };
      }
    }
    return m;
  });

  return { matches: sanitizedMatches, modified };
}

export function loadTournamentState(): StoredState {
  try {
    const rawTeams = localStorage.getItem(STORAGE_KEYS.TEAMS);
    const rawMatches = localStorage.getItem(STORAGE_KEYS.MATCHES);
    const rawConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
    const rawByes = localStorage.getItem(STORAGE_KEYS.BYES);

    if (rawTeams && rawMatches && rawConfig) {
      const parsedTeams: Team[] = JSON.parse(rawTeams);
      // Merge official logos and colors from INITIAL_TEAMS map
      const initialMap = new Map<string, Team>();
      INITIAL_TEAMS.forEach((t) => {
        initialMap.set(t.id, t);
        initialMap.set(t.clubName.toLowerCase(), t);
      });

      const updatedTeams = parsedTeams.map((t) => {
        const matching = initialMap.get(t.id) || initialMap.get(t.clubName.toLowerCase());
        if (matching) {
          return {
            ...t,
            logo: matching.logo,
            color: matching.color,
            secondaryColor: matching.secondaryColor,
          };
        }
        return t;
      });

      let matches: Match[] = JSON.parse(rawMatches);
      let byesPerRound: Record<number, string> = rawByes ? JSON.parse(rawByes) : {};
      let parsedConfig: TournamentConfig = JSON.parse(rawConfig);

      // Reorganize and squeeze 1st leg into MD 1-19 (10 matches/MD, no overlaps) and ensure 2nd leg is MD 20-38 unplayed
      const squeezed = squeezeFirstLegAndCleanSecondLeg(matches, updatedTeams, parsedConfig);
      matches = squeezed.matches;
      byesPerRound = squeezed.byesPerRound;
      parsedConfig = squeezed.config;

      if (squeezed.modified) {
        saveTournamentState({
          teams: updatedTeams,
          matches,
          config: parsedConfig,
          byesPerRound,
        });
      }

      return {
        teams: updatedTeams,
        matches,
        config: parsedConfig,
        byesPerRound,
      };
    }
  } catch (err) {
    console.error('Error loading tournament state from localStorage:', err);
  }

  // First time initialization: generate fresh schedule for INITIAL_TEAMS in Double Round-Robin (Home & Away)
  const teams = [...INITIAL_TEAMS];
  const isDouble = INITIAL_CONFIG.format === 'double_round_robin';
  const pattern = INITIAL_CONFIG.secondLegPattern || 'crescendo';
  const { matches, byesPerRound } = generateRoundRobinSchedule(teams, isDouble, pattern);

  const totalRounds = isDouble ? (teams.length % 2 === 0 ? (teams.length - 1) * 2 : teams.length * 2) : (teams.length % 2 === 0 ? teams.length - 1 : teams.length);

  const state: StoredState = {
    teams,
    matches, // Clean unplayed schedule - No matches played yet
    config: {
      ...INITIAL_CONFIG,
      totalRounds,
    },
    byesPerRound,
  };

  saveTournamentState(state);
  return state;
}

export function saveTournamentState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(state.teams));

    // Strip screenshots from matches to keep local matches cache tiny (~60KB) and strictly avoid QuotaExceededError
    const slimMatches = state.matches.map((m) => {
      if (m.screenshotUrl) {
        const { screenshotUrl, ...rest } = m;
        return rest as Match;
      }
      return m;
    });

    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(slimMatches));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
    localStorage.setItem(STORAGE_KEYS.BYES, JSON.stringify(state.byesPerRound));
  } catch (err) {
    console.error('Error saving tournament state to localStorage:', err);
  }
}

export function resetTournamentSchedule(
  teams: Team[],
  config: TournamentConfig
): StoredState {
  const isDouble = config.format === 'double_round_robin';
  const pattern = config.secondLegPattern || 'crescendo';
  const { matches, byesPerRound } = generateRoundRobinSchedule(teams, isDouble, pattern);
  const totalRounds = isDouble ? (teams.length % 2 === 0 ? (teams.length - 1) * 2 : teams.length * 2) : (teams.length % 2 === 0 ? teams.length - 1 : teams.length);

  const newState: StoredState = {
    teams,
    matches,
    config: {
      ...config,
      totalRounds,
    },
    byesPerRound,
  };

  saveTournamentState(newState);
  return newState;
}

export function exportTournamentToJson(state: StoredState): string {
  return JSON.stringify(state, null, 2);
}
