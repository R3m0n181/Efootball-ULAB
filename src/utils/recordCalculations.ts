import {
  Match,
  Team,
  StandingsRow,
  TournamentConfig,
  MatchHighStat,
  TeamStreakStat,
  TeamHomeAwayStat,
  TeamEfficiencyStat,
  TeamMilestoneStat,
} from '../types';

export function getMatchHighsAndRecords(teams: Team[], matches: Match[]) {
  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const completed = matches.filter(
    (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
  );

  // 1. Highest Combined Scoring Matches (e.g. 5-3 = 8 goals)
  const highestScoring: MatchHighStat[] = completed
    .map((m) => {
      const home = teamMap.get(m.homeTeamId) || teams[0];
      const away = teamMap.get(m.awayTeamId) || teams[1];
      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;
      const total = hScore + aScore;
      return {
        rank: 0,
        match: m,
        homeTeam: home,
        awayTeam: away,
        round: m.round,
        scoreString: `${hScore} - ${aScore}`,
        primaryValue: total,
        metricLabel: `${total} Goals`,
        secondaryLabel: `${home.shortCode} ${hScore} - ${aScore} ${away.shortCode}`,
      };
    })
    .sort((a, b) => b.primaryValue - a.primaryValue || a.round - b.round)
    .slice(0, 10);

  highestScoring.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  // 2. Biggest Margin of Victory / Blowouts
  const biggestWins: MatchHighStat[] = completed
    .filter((m) => (m.homeScore ?? 0) !== (m.awayScore ?? 0))
    .map((m) => {
      const home = teamMap.get(m.homeTeamId) || teams[0];
      const away = teamMap.get(m.awayTeamId) || teams[1];
      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;
      const margin = Math.abs(hScore - aScore);
      const winner = hScore > aScore ? home : away;
      const loser = hScore > aScore ? away : home;
      const winScore = Math.max(hScore, aScore);
      const loseScore = Math.min(hScore, aScore);
      return {
        rank: 0,
        match: m,
        homeTeam: home,
        awayTeam: away,
        round: m.round,
        scoreString: `${hScore} - ${aScore}`,
        primaryValue: margin,
        metricLabel: `+${margin} Goal Margin`,
        secondaryLabel: `${winner.clubName} def. ${loser.clubName} (${winScore}-${loseScore})`,
      };
    })
    .sort((a, b) => b.primaryValue - a.primaryValue || a.round - b.round)
    .slice(0, 10);

  biggestWins.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  // 3. Highest Single-Team Scoring Game
  interface SingleTeamScoreItem {
    rank: number;
    match: Match;
    scoringTeam: Team;
    concedingTeam: Team;
    goalsScored: number;
    round: number;
    scoreString: string;
    isHome: boolean;
  }

  const singleTeamScores: SingleTeamScoreItem[] = [];
  completed.forEach((m) => {
    const home = teamMap.get(m.homeTeamId) || teams[0];
    const away = teamMap.get(m.awayTeamId) || teams[1];
    const hScore = m.homeScore ?? 0;
    const aScore = m.awayScore ?? 0;

    singleTeamScores.push({
      rank: 0,
      match: m,
      scoringTeam: home,
      concedingTeam: away,
      goalsScored: hScore,
      round: m.round,
      scoreString: `${hScore} - ${aScore}`,
      isHome: true,
    });

    singleTeamScores.push({
      rank: 0,
      match: m,
      scoringTeam: away,
      concedingTeam: home,
      goalsScored: aScore,
      round: m.round,
      scoreString: `${hScore} - ${aScore}`,
      isHome: false,
    });
  });

  singleTeamScores.sort((a, b) => b.goalsScored - a.goalsScored || a.round - b.round);
  const highestSingleTeamScores = singleTeamScores.slice(0, 10);
  highestSingleTeamScores.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  // 4. Biggest Away Wins (Away triumphs)
  const biggestAwayWins: MatchHighStat[] = completed
    .filter((m) => (m.awayScore ?? 0) > (m.homeScore ?? 0))
    .map((m) => {
      const home = teamMap.get(m.homeTeamId) || teams[0];
      const away = teamMap.get(m.awayTeamId) || teams[1];
      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;
      const margin = aScore - hScore;
      return {
        rank: 0,
        match: m,
        homeTeam: home,
        awayTeam: away,
        round: m.round,
        scoreString: `${hScore} - ${aScore}`,
        primaryValue: margin,
        metricLabel: `+${margin} Away Win`,
        secondaryLabel: `${away.clubName} won at ${home.shortCode}`,
      };
    })
    .sort((a, b) => b.primaryValue - a.primaryValue || a.round - b.round)
    .slice(0, 10);

  biggestAwayWins.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return {
    highestScoring,
    biggestWins,
    highestSingleTeamScores,
    biggestAwayWins,
  };
}

export function getTeamStreaksAndForm(teams: Team[], matches: Match[]): TeamStreakStat[] {
  const completed = matches
    .filter((m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null)
    .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);

  return teams.map((team) => {
    // Chronological completed matches for this team
    const teamMatches = completed.filter(
      (m) => m.homeTeamId === team.id || m.awayTeamId === team.id
    );

    let maxWinStreak = 0;
    let currWinStreak = 0;

    let maxUnbeatenStreak = 0;
    let currUnbeatenStreak = 0;

    let maxCleanSheetStreak = 0;
    let currCleanSheetStreak = 0;

    let maxScoringStreak = 0;
    let currScoringStreak = 0;

    const fullForm: ('W' | 'D' | 'L')[] = [];

    teamMatches.forEach((m) => {
      const isHome = m.homeTeamId === team.id;
      const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const oppScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);

      // Outcome
      let outcome: 'W' | 'D' | 'L' = 'D';
      if (myScore > oppScore) outcome = 'W';
      else if (myScore < oppScore) outcome = 'L';
      fullForm.push(outcome);

      // Win Streak
      if (outcome === 'W') {
        currWinStreak += 1;
        if (currWinStreak > maxWinStreak) maxWinStreak = currWinStreak;
      } else {
        currWinStreak = 0;
      }

      // Unbeaten Streak
      if (outcome === 'W' || outcome === 'D') {
        currUnbeatenStreak += 1;
        if (currUnbeatenStreak > maxUnbeatenStreak) maxUnbeatenStreak = currUnbeatenStreak;
      } else {
        currUnbeatenStreak = 0;
      }

      // Clean Sheet Streak
      if (oppScore === 0) {
        currCleanSheetStreak += 1;
        if (currCleanSheetStreak > maxCleanSheetStreak) maxCleanSheetStreak = currCleanSheetStreak;
      } else {
        currCleanSheetStreak = 0;
      }

      // Scoring Streak
      if (myScore > 0) {
        currScoringStreak += 1;
        if (currScoringStreak > maxScoringStreak) maxScoringStreak = currScoringStreak;
      } else {
        currScoringStreak = 0;
      }
    });

    return {
      team,
      longestWinStreak: maxWinStreak,
      currentWinStreak: currWinStreak,
      longestUnbeatenStreak: maxUnbeatenStreak,
      currentUnbeatenStreak: currUnbeatenStreak,
      longestCleanSheetStreak: maxCleanSheetStreak,
      currentCleanSheetStreak: currCleanSheetStreak,
      longestScoringStreak: maxScoringStreak,
      currentScoringStreak: currScoringStreak,
      last5Form: fullForm.slice(-5),
    };
  });
}

export function getTeamHomeAwayStats(
  teams: Team[],
  matches: Match[],
  config: TournamentConfig
) {
  const completed = matches.filter(
    (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
  );

  let totalHomeWins = 0;
  let totalAwayWins = 0;
  let totalDraws = 0;
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;

  const statsMap = new Map<
    string,
    {
      home: { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; pts: number };
      away: { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; pts: number };
    }
  >();

  teams.forEach((t) => {
    statsMap.set(t.id, {
      home: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 },
      away: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 },
    });
  });

  completed.forEach((m) => {
    const hScore = m.homeScore ?? 0;
    const aScore = m.awayScore ?? 0;
    totalHomeGoals += hScore;
    totalAwayGoals += aScore;

    const hStats = statsMap.get(m.homeTeamId);
    const aStats = statsMap.get(m.awayTeamId);

    if (hStats) {
      hStats.home.played += 1;
      hStats.home.gf += hScore;
      hStats.home.ga += aScore;
    }
    if (aStats) {
      aStats.away.played += 1;
      aStats.away.gf += aScore;
      aStats.away.ga += hScore;
    }

    if (hScore > aScore) {
      totalHomeWins += 1;
      if (hStats) {
        hStats.home.won += 1;
        hStats.home.pts += config.pointsForWin;
      }
      if (aStats) {
        aStats.away.lost += 1;
        aStats.away.pts += config.pointsForLoss;
      }
    } else if (hScore < aScore) {
      totalAwayWins += 1;
      if (aStats) {
        aStats.away.won += 1;
        aStats.away.pts += config.pointsForWin;
      }
      if (hStats) {
        hStats.home.lost += 1;
        hStats.home.pts += config.pointsForLoss;
      }
    } else {
      totalDraws += 1;
      if (hStats) {
        hStats.home.drawn += 1;
        hStats.home.pts += config.pointsForDraw;
      }
      if (aStats) {
        aStats.away.drawn += 1;
        aStats.away.pts += config.pointsForDraw;
      }
    }
  });

  const totalMatches = completed.length;
  const homeWinPct = totalMatches > 0 ? Math.round((totalHomeWins / totalMatches) * 100) : 0;
  const awayWinPct = totalMatches > 0 ? Math.round((totalAwayWins / totalMatches) * 100) : 0;
  const drawPct = totalMatches > 0 ? Math.round((totalDraws / totalMatches) * 100) : 0;

  const teamStats: TeamHomeAwayStat[] = teams.map((team) => {
    const raw = statsMap.get(team.id)!;
    const hPlayed = raw.home.played;
    const aPlayed = raw.away.played;

    return {
      team,
      home: {
        played: hPlayed,
        won: raw.home.won,
        drawn: raw.home.drawn,
        lost: raw.home.lost,
        goalsFor: raw.home.gf,
        goalsAgainst: raw.home.ga,
        goalDifference: raw.home.gf - raw.home.ga,
        points: raw.home.pts,
        ppg: hPlayed > 0 ? Number((raw.home.pts / hPlayed).toFixed(2)) : 0,
        winRate: hPlayed > 0 ? Math.round((raw.home.won / hPlayed) * 100) : 0,
      },
      away: {
        played: aPlayed,
        won: raw.away.won,
        drawn: raw.away.drawn,
        lost: raw.away.lost,
        goalsFor: raw.away.gf,
        goalsAgainst: raw.away.ga,
        goalDifference: raw.away.gf - raw.away.ga,
        points: raw.away.pts,
        ppg: aPlayed > 0 ? Number((raw.away.pts / aPlayed).toFixed(2)) : 0,
        winRate: aPlayed > 0 ? Math.round((raw.away.won / aPlayed) * 100) : 0,
      },
    };
  });

  return {
    leagueOverview: {
      totalMatches,
      totalHomeWins,
      totalAwayWins,
      totalDraws,
      homeWinPct,
      awayWinPct,
      drawPct,
      totalHomeGoals,
      totalAwayGoals,
      homeGoalsPerMatch: totalMatches > 0 ? (totalHomeGoals / totalMatches).toFixed(2) : '0.00',
      awayGoalsPerMatch: totalMatches > 0 ? (totalAwayGoals / totalMatches).toFixed(2) : '0.00',
    },
    teamStats,
  };
}

export function getTeamEfficiencyStats(teams: Team[], matches: Match[]): TeamEfficiencyStat[] {
  const completed = matches.filter(
    (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
  );

  return teams.map((team) => {
    const teamMatches = completed.filter(
      (m) => m.homeTeamId === team.id || m.awayTeamId === team.id
    );

    const matchesPlayed = teamMatches.length;
    let cleanSheets = 0;
    let bttsCount = 0;
    let over25Count = 0;
    let under25Count = 0;
    let failedToScoreCount = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    teamMatches.forEach((m) => {
      const isHome = m.homeTeamId === team.id;
      const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const oppScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      const totalMatchGoals = myScore + oppScore;

      goalsFor += myScore;
      goalsAgainst += oppScore;

      if (oppScore === 0) cleanSheets += 1;
      if (myScore > 0 && oppScore > 0) bttsCount += 1;
      if (totalMatchGoals >= 3) over25Count += 1;
      else under25Count += 1;
      if (myScore === 0) failedToScoreCount += 1;
    });

    const cleanSheetPct = matchesPlayed > 0 ? Math.round((cleanSheets / matchesPlayed) * 100) : 0;
    const bttsPct = matchesPlayed > 0 ? Math.round((bttsCount / matchesPlayed) * 100) : 0;
    const over25Pct = matchesPlayed > 0 ? Math.round((over25Count / matchesPlayed) * 100) : 0;
    const under25Pct = matchesPlayed > 0 ? Math.round((under25Count / matchesPlayed) * 100) : 0;
    const failedToScorePct =
      matchesPlayed > 0 ? Math.round((failedToScoreCount / matchesPlayed) * 100) : 0;

    const goalDominanceRatio =
      goalsAgainst === 0
        ? goalsFor > 0
          ? 99.0
          : 1.0
        : Number((goalsFor / goalsAgainst).toFixed(2));

    return {
      team,
      matchesPlayed,
      cleanSheets,
      cleanSheetPct,
      bttsCount,
      bttsPct,
      over25Count,
      over25Pct,
      under25Count,
      under25Pct,
      failedToScoreCount,
      failedToScorePct,
      goalsFor,
      goalsAgainst,
      goalDominanceRatio,
    };
  });
}

export function getTeamMilestoneStats(
  teams: Team[],
  standings: StandingsRow[],
  totalTeamMatches = 40
): TeamMilestoneStat[] {
  const standingsMap = new Map<string, StandingsRow>();
  standings.forEach((s) => standingsMap.set(s.team.id, s));

  return teams.map((team) => {
    const row = standingsMap.get(team.id);
    const played = row ? row.played : 0;
    const points = row ? row.points : 0;
    const won = row ? row.won : 0;
    const goalsFor = row ? row.goalsFor : 0;
    const rank = row ? row.rank : 0;

    const totalScheduled = totalTeamMatches;
    const remainingMatches = Math.max(0, totalScheduled - played);
    const maxPossiblePoints = points + remainingMatches * 3;
    const ppg = played > 0 ? Number((points / played).toFixed(2)) : 0;
    const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
    const goalsPerPoint = points > 0 ? Number((goalsFor / points).toFixed(2)) : 0;

    return {
      team,
      currentRank: rank,
      played,
      remainingMatches,
      points,
      ppg,
      maxPossiblePoints,
      winRate,
      goalsPerPoint,
    };
  });
}
