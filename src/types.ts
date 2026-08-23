export interface Team {
  id: string;
  managerName: string;
  clubName: string;
  shortCode: string;
  logo: string;
  color: string;
  secondaryColor: string;
  feePaid?: boolean;
}

export interface GoalEvent {
  id: string;
  teamId: string;
  scorerName?: string;
  assistName?: string;
  minute?: number;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'disputed';

export interface Match {
  id: string;
  round: number; // Round / Matchday number (1 to 42 for Home & Away)
  matchNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  playedAt?: string; // ISO string
  goals?: GoalEvent[];
  notes?: string;
  screenshotUrl?: string;
  submittedBy?: string;
}

export interface StandingsRow {
  team: Team;
  rank: number;
  previousRank?: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
  recentMatches: {
    matchId: string;
    opponentShortCode: string;
    result: 'W' | 'D' | 'L';
    score: string;
    isHome: boolean;
  }[];
  cleanSheets: number;
}

export interface TeamAttackStat {
  rank: number;
  team: Team;
  matchesPlayed: number;
  goalsScored: number;
  goalsConceded?: number;
  goalDifference?: number;
  goalsPerMatch: number;
  highestMatchScore: number;
}

export interface TeamDefenseStat {
  rank: number;
  team: Team;
  matchesPlayed: number;
  goalsConceded: number;
  goalsConcededPerMatch: number;
  cleanSheets: number;
  cleanSheetPct: number;
}

export interface HighScoringMatchStat {
  rank: number;
  matchId: string;
  round: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  totalGoals: number;
  scoreString: string;
  playedAt?: string;
}

export interface TournamentConfig {
  name: string;
  season: string;
  format: 'single_round_robin' | 'double_round_robin';
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  currentRound: number;
  totalRounds: number;
  topQualifierSpots: number; // e.g. 4 for Champions League / Playoffs
  europaSpots: number; // e.g. next 4 spots
}

