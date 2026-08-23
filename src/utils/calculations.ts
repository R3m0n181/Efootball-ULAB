import {
  Match,
  Team,
  StandingsRow,
  TeamAttackStat,
  TeamDefenseStat,
  HighScoringMatchStat,
  TournamentConfig,
} from '../types';

export function calculateStandings(
  teams: Team[],
  matches: Match[],
  config: TournamentConfig
): StandingsRow[] {
  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  // Initialize stats for every team
  const statsMap = new Map<
    string,
    {
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
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
  >();

  teams.forEach((team) => {
    statsMap.set(team.id, {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      form: [],
      recentMatches: [],
      cleanSheets: 0,
    });
  });

  // Sort completed matches by round and match order
  const completedMatches = matches
    .filter((m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null)
    .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);

  // Process match results
  completedMatches.forEach((m) => {
    const homeStats = statsMap.get(m.homeTeamId);
    const awayStats = statsMap.get(m.awayTeamId);
    const homeTeam = teamMap.get(m.homeTeamId);
    const awayTeam = teamMap.get(m.awayTeamId);

    if (!homeStats || !awayStats || m.homeScore === null || m.awayScore === null) return;

    homeStats.played += 1;
    awayStats.played += 1;

    homeStats.goalsFor += m.homeScore;
    homeStats.goalsAgainst += m.awayScore;
    awayStats.goalsFor += m.awayScore;
    awayStats.goalsAgainst += m.homeScore;

    if (m.awayScore === 0) homeStats.cleanSheets += 1;
    if (m.homeScore === 0) awayStats.cleanSheets += 1;

    if (m.homeScore > m.awayScore) {
      // Home Win
      homeStats.won += 1;
      homeStats.points += config.pointsForWin;
      homeStats.form.push('W');
      homeStats.recentMatches.push({
        matchId: m.id,
        opponentShortCode: awayTeam ? awayTeam.shortCode : 'AWY',
        result: 'W',
        score: `${m.homeScore}-${m.awayScore}`,
        isHome: true,
      });

      awayStats.lost += 1;
      awayStats.points += config.pointsForLoss;
      awayStats.form.push('L');
      awayStats.recentMatches.push({
        matchId: m.id,
        opponentShortCode: homeTeam ? homeTeam.shortCode : 'HOM',
        result: 'L',
        score: `${m.awayScore}-${m.homeScore}`,
        isHome: false,
      });
    } else if (m.homeScore < m.awayScore) {
      // Away Win
      awayStats.won += 1;
      awayStats.points += config.pointsForWin;
      awayStats.form.push('W');
      awayStats.recentMatches.push({
        matchId: m.id,
        opponentShortCode: homeTeam ? homeTeam.shortCode : 'HOM',
        result: 'W',
        score: `${m.awayScore}-${m.homeScore}`,
        isHome: false,
      });

      homeStats.lost += 1;
      homeStats.points += config.pointsForLoss;
      homeStats.form.push('L');
      homeStats.recentMatches.push({
        matchId: m.id,
        opponentShortCode: awayTeam ? awayTeam.shortCode : 'AWY',
        result: 'L',
        score: `${m.homeScore}-${m.awayScore}`,
        isHome: true,
      });
    } else {
      // Draw
      homeStats.drawn += 1;
      homeStats.points += config.pointsForDraw;
      homeStats.form.push('D');
      homeStats.recentMatches.push({
        matchId: m.id,
        opponentShortCode: awayTeam ? awayTeam.shortCode : 'AWY',
        result: 'D',
        score: `${m.homeScore}-${m.awayScore}`,
        isHome: true,
      });

      awayStats.drawn += 1;
      awayStats.points += config.pointsForDraw;
      awayStats.form.push('D');
      awayStats.recentMatches.push({
        matchId: m.id,
        opponentShortCode: homeTeam ? homeTeam.shortCode : 'HOM',
        result: 'D',
        score: `${m.awayScore}-${m.homeScore}`,
        isHome: false,
      });
    }
  });

  // Calculate Goal Difference and sort
  const standings: StandingsRow[] = teams.map((team) => {
    const stats = statsMap.get(team.id)!;
    return {
      team,
      rank: 0,
      played: stats.played,
      won: stats.won,
      drawn: stats.drawn,
      lost: stats.lost,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      goalDifference: stats.goalsFor - stats.goalsAgainst,
      points: stats.points,
      form: stats.form.slice(-5), // last 5 matches
      recentMatches: stats.recentMatches.slice(-5),
      cleanSheets: stats.cleanSheets,
    };
  });

  // Sort by: 1. Points (desc), 2. Goal Difference (desc), 3. Goals For (desc), 4. Alphabetical by Club Name
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.clubName.localeCompare(b.team.clubName);
  });

  // Assign ranks
  standings.forEach((row, idx) => {
    row.rank = idx + 1;
  });

  return standings;
}

export function calculateTeamAttackLeaderboard(
  teams: Team[],
  matches: Match[]
): TeamAttackStat[] {
  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const statsMap = new Map<
    string,
    {
      matchesPlayed: number;
      goalsScored: number;
      goalsConceded: number;
      highestMatchScore: number;
    }
  >();

  teams.forEach((t) => {
    statsMap.set(t.id, {
      matchesPlayed: 0,
      goalsScored: 0,
      goalsConceded: 0,
      highestMatchScore: 0,
    });
  });

  matches
    .filter((m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null)
    .forEach((m) => {
      const hStats = statsMap.get(m.homeTeamId);
      const aStats = statsMap.get(m.awayTeamId);

      if (hStats && aStats && m.homeScore !== null && m.awayScore !== null) {
        hStats.matchesPlayed += 1;
        hStats.goalsScored += m.homeScore;
        hStats.goalsConceded += m.awayScore;
        hStats.highestMatchScore = Math.max(hStats.highestMatchScore, m.homeScore);

        aStats.matchesPlayed += 1;
        aStats.goalsScored += m.awayScore;
        aStats.goalsConceded += m.homeScore;
        aStats.highestMatchScore = Math.max(aStats.highestMatchScore, m.awayScore);
      }
    });

  const list: TeamAttackStat[] = teams.map((t) => {
    const stats = statsMap.get(t.id)!;
    const goalsPerMatch =
      stats.matchesPlayed > 0
        ? Number((stats.goalsScored / stats.matchesPlayed).toFixed(2))
        : 0;

    return {
      rank: 0,
      team: t,
      matchesPlayed: stats.matchesPlayed,
      goalsScored: stats.goalsScored,
      goalsConceded: stats.goalsConceded,
      goalDifference: stats.goalsScored - stats.goalsConceded,
      goalsPerMatch,
      highestMatchScore: stats.highestMatchScore,
    };
  });

  list.sort((a, b) => {
    // Option 1 Formula for Top Attacking Team:
    // 1. Teams that have played at least 1 match take precedence over 0-match teams
    if (a.matchesPlayed === 0 && b.matchesPlayed > 0) return 1;
    if (b.matchesPlayed === 0 && a.matchesPlayed > 0) return -1;
    if (a.matchesPlayed === 0 && b.matchesPlayed === 0) {
      return a.team.clubName.localeCompare(b.team.clubName);
    }

    // 2. Primary Metric: Highest average goals scored per match (GF / P)
    if (b.goalsPerMatch !== a.goalsPerMatch) {
      return b.goalsPerMatch - a.goalsPerMatch;
    }

    // 3. Tiebreaker 1: Highest total Goals Scored (GF)
    if (b.goalsScored !== a.goalsScored) {
      return b.goalsScored - a.goalsScored;
    }

    // 4. Tiebreaker 2: Highest Goal Difference (GD)
    const aStats = statsMap.get(a.team.id)!;
    const bStats = statsMap.get(b.team.id)!;
    const aGD = aStats.goalsScored - aStats.goalsConceded;
    const bGD = bStats.goalsScored - bStats.goalsConceded;
    if (bGD !== aGD) {
      return bGD - aGD;
    }

    // 5. Tiebreaker 3: Most Matches Played
    if (b.matchesPlayed !== a.matchesPlayed) {
      return b.matchesPlayed - a.matchesPlayed;
    }

    // 6. Tiebreaker 4: Highest single match score
    if (b.highestMatchScore !== a.highestMatchScore) {
      return b.highestMatchScore - a.highestMatchScore;
    }

    // 7. Alphabetical
    return a.team.clubName.localeCompare(b.team.clubName);
  });

  list.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return list;
}

export function calculateTeamDefenseLeaderboard(
  teams: Team[],
  matches: Match[]
): TeamDefenseStat[] {
  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const statsMap = new Map<
    string,
    {
      matchesPlayed: number;
      goalsConceded: number;
      cleanSheets: number;
    }
  >();

  teams.forEach((t) => {
    statsMap.set(t.id, {
      matchesPlayed: 0,
      goalsConceded: 0,
      cleanSheets: 0,
    });
  });

  matches
    .filter((m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null)
    .forEach((m) => {
      const hStats = statsMap.get(m.homeTeamId);
      const aStats = statsMap.get(m.awayTeamId);

      if (hStats && aStats && m.homeScore !== null && m.awayScore !== null) {
        hStats.matchesPlayed += 1;
        hStats.goalsConceded += m.awayScore;
        if (m.awayScore === 0) hStats.cleanSheets += 1;

        aStats.matchesPlayed += 1;
        aStats.goalsConceded += m.homeScore;
        if (m.homeScore === 0) aStats.cleanSheets += 1;
      }
    });

  const list: TeamDefenseStat[] = teams.map((t) => {
    const stats = statsMap.get(t.id)!;
    const goalsConcededPerMatch =
      stats.matchesPlayed > 0
        ? Number((stats.goalsConceded / stats.matchesPlayed).toFixed(2))
        : 0;
    const cleanSheetPct =
      stats.matchesPlayed > 0
        ? Math.round((stats.cleanSheets / stats.matchesPlayed) * 100)
        : 0;

    return {
      rank: 0,
      team: t,
      matchesPlayed: stats.matchesPlayed,
      goalsConceded: stats.goalsConceded,
      goalsConcededPerMatch,
      cleanSheets: stats.cleanSheets,
      cleanSheetPct,
    };
  });

  list.sort((a, b) => {
    // Option 1 Formula for Top Defending Team:
    // 1. Teams that have played at least 1 match take precedence over 0-match teams
    if (a.matchesPlayed === 0 && b.matchesPlayed > 0) return 1;
    if (b.matchesPlayed === 0 && a.matchesPlayed > 0) return -1;
    if (a.matchesPlayed === 0 && b.matchesPlayed === 0) {
      return a.team.clubName.localeCompare(b.team.clubName);
    }

    // 2. Primary Metric: Lowest average goals conceded per match (GA / P)
    if (a.goalsConcededPerMatch !== b.goalsConcededPerMatch) {
      return a.goalsConcededPerMatch - b.goalsConcededPerMatch;
    }

    // 3. Tiebreaker 1: Most Clean Sheets (CS)
    if (b.cleanSheets !== a.cleanSheets) {
      return b.cleanSheets - a.cleanSheets;
    }

    // 4. Tiebreaker 2: Lowest absolute Goals Conceded (GA)
    if (a.goalsConceded !== b.goalsConceded) {
      return a.goalsConceded - b.goalsConceded;
    }

    // 5. Tiebreaker 3: Most Matches Played (tested defense)
    if (b.matchesPlayed !== a.matchesPlayed) {
      return b.matchesPlayed - a.matchesPlayed;
    }

    // 6. Alphabetical
    return a.team.clubName.localeCompare(b.team.clubName);
  });

  list.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return list;
}

export function calculateHighScoringMatches(
  teams: Team[],
  matches: Match[]
): HighScoringMatchStat[] {
  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const completed = matches.filter(
    (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
  );

  const list: HighScoringMatchStat[] = completed.map((m) => {
    const homeTeam = teamMap.get(m.homeTeamId) || teams[0];
    const awayTeam = teamMap.get(m.awayTeamId) || teams[1];
    const hScore = m.homeScore || 0;
    const aScore = m.awayScore || 0;
    const totalGoals = hScore + aScore;

    return {
      rank: 0,
      matchId: m.id,
      round: m.round,
      homeTeam,
      awayTeam,
      homeScore: hScore,
      awayScore: aScore,
      totalGoals,
      scoreString: `${hScore} - ${aScore}`,
      playedAt: m.playedAt,
    };
  });

  list.sort((a, b) => {
    if (b.totalGoals !== a.totalGoals) return b.totalGoals - a.totalGoals;
    return (b.round || 0) - (a.round || 0);
  });

  list.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return list;
}

export function getTournamentSummary(
  matches: Match[],
  standings: StandingsRow[],
  teams?: Team[]
) {
  const totalMatches = matches.length;
  const completedMatches = matches.filter((m) => m.status === 'completed');
  const totalGoals = completedMatches.reduce(
    (sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0),
    0
  );
  const avgGoals =
    completedMatches.length > 0
      ? (totalGoals / completedMatches.length).toFixed(2)
      : '0.00';

  const leader = standings.length > 0 ? standings[0] : null;

  let topScoringTeam: TeamAttackStat | null = null;
  let topDefendingTeam: TeamDefenseStat | null = null;

  const actualTeams = teams && teams.length > 0 ? teams : standings.map((s) => s.team);

  if (actualTeams.length > 0 && completedMatches.length > 0) {
    const attackList = calculateTeamAttackLeaderboard(actualTeams, matches);
    if (attackList.length > 0 && attackList[0].matchesPlayed > 0) {
      topScoringTeam = attackList[0];
    }

    const defenseList = calculateTeamDefenseLeaderboard(actualTeams, matches);
    if (defenseList.length > 0 && defenseList[0].matchesPlayed > 0) {
      topDefendingTeam = defenseList[0];
    }
  }

  return {
    totalMatches,
    completedMatches: completedMatches.length,
    progressPercentage:
      totalMatches > 0 ? Math.round((completedMatches.length / totalMatches) * 100) : 0,
    totalGoals,
    avgGoals,
    leader,
    topScoringTeam,
    topDefendingTeam,
    mostCleanSheetsTeam: topDefendingTeam,
  };
}
