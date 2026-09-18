import { Match, Team, SecondLegPattern, SecondLegPatternInfo } from '../types';

export const SECOND_LEG_PATTERNS_METADATA: Record<SecondLegPattern, SecondLegPatternInfo> = {
  crescendo: {
    id: 'crescendo',
    name: 'High-Volatility Crescendo (Grand Climax)',
    tagline: 'Escalating 6-pointers leading to a dramatic final run-in',
    description:
      'Trap & upset rounds early in Leg 2 compress the field, while blockbuster title deciders and survival battles pack the final matchdays, generating non-stop lead changes right to the finish.',
    volatilityRating: 'Maximum (Escalating)',
    color: 'emerald',
  },
  shockwaves: {
    id: 'shockwaves',
    name: 'Interleaved Shockwaves (Continuous Churn)',
    tagline: 'Alternating high-impact rival clash rounds with trap rounds',
    description:
      'Every 1-2 matchdays features a high-density cluster of direct rival clashes. The leaderboard stays in continuous motion throughout the entire 2nd phase without stagnating.',
    volatilityRating: 'Maximum (Continuous)',
    color: 'amber',
  },
  gauntlet: {
    id: 'gauntlet',
    name: 'Early Leveler (The Gauntlet)',
    tagline: 'Front-loads giant clashes right at the restart of Leg 2',
    description:
      'Pits direct rivals against each other immediately in MD 22-28 to blow open any mid-season point cushion, squeezing the entire table into a single-digit chase.',
    volatilityRating: 'High (Frontloaded)',
    color: 'purple',
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced Asymmetric (Premier League)',
    tagline: 'Smooth, authentic European league dispersion with spacing',
    description:
      'Spreads rival matches evenly across the 21 matchdays with guaranteed spacing buffers between reverse fixtures.',
    volatilityRating: 'Standard (Even)',
    color: 'blue',
  },
};

/**
 * Calculates the table-volatility score for each Leg 1 round.
 * Rounds containing direct rival clashes ("6-pointers" between teams close in rank)
 * have the highest volatility scores because they directly transfer 3 points between adjacent contenders.
 */
export function computeLeg1RoundVolatilities(
  matches: Match[],
  teams: Team[],
  numRounds: number
): Record<number, number> {
  const seedMap = new Map<string, number>();
  teams.forEach((t, i) => seedMap.set(t.id, i + 1));

  const completedMatches = matches.filter(
    (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
  );

  const rankMap = new Map<string, number>();
  if (completedMatches.length >= 8) {
    const pointsMap = new Map<string, number>();
    teams.forEach((t) => pointsMap.set(t.id, 0));
    completedMatches.forEach((m) => {
      const h = m.homeScore!;
      const a = m.awayScore!;
      if (h > a) pointsMap.set(m.homeTeamId, (pointsMap.get(m.homeTeamId) || 0) + 3);
      else if (a > h) pointsMap.set(m.awayTeamId, (pointsMap.get(m.awayTeamId) || 0) + 3);
      else {
        pointsMap.set(m.homeTeamId, (pointsMap.get(m.homeTeamId) || 0) + 1);
        pointsMap.set(m.awayTeamId, (pointsMap.get(m.awayTeamId) || 0) + 1);
      }
    });
    const sortedTeams = [...teams].sort(
      (a, b) => (pointsMap.get(b.id) || 0) - (pointsMap.get(a.id) || 0)
    );
    sortedTeams.forEach((t, idx) => rankMap.set(t.id, idx + 1));
  } else {
    teams.forEach((t, idx) => rankMap.set(t.id, idx + 1));
  }

  const volatilities: Record<number, number> = {};
  for (let r = 1; r <= numRounds; r++) {
    const roundMatches = matches.filter((m) => m.round === r);
    let volScore = 0;

    roundMatches.forEach((m) => {
      const r1 = rankMap.get(m.homeTeamId) || seedMap.get(m.homeTeamId) || 1;
      const r2 = rankMap.get(m.awayTeamId) || seedMap.get(m.awayTeamId) || 1;
      const diff = Math.abs(r1 - r2);

      // Close rank clashes: 1v2, 3v4, 10v11 yield highest scores
      volScore += Math.max(1, teams.length + 1 - diff);

      // Clashes in top-4: massive championship volatility
      if (r1 <= 4 && r2 <= 4) volScore += 16;
      // Clashes in European qualification zone (5th-8th):
      if (r1 >= 5 && r1 <= 8 && r2 >= 5 && r2 <= 8) volScore += 10;
      // Clashes at bottom of table (dogfight):
      if (r1 >= teams.length - 3 && r2 >= teams.length - 3) volScore += 10;
    });

    volatilities[r] = volScore;
  }

  return volatilities;
}

/**
 * Generates an asymmetric round mapping for Leg 2 according to the specified volatility pattern.
 * Maps each Leg 1 round (1..numRounds) to a distinct Leg 2 round (numRounds+1..2*numRounds).
 *
 * Enforces key scheduling constraints:
 * 1. Spacing Buffer: ensures a minimum round gap between a fixture and its reverse rematch (no immediate rematches).
 * 2. High Volatility Shaping: organizes 6-pointers and trap matches based on the selected strategy.
 * 3. Determinism: produces a stable, mathematically guaranteed calendar for any team count.
 */
export function generateAsymmetricRoundMapping(
  numRounds: number,
  pattern: SecondLegPattern = 'crescendo',
  roundVolatilities?: Record<number, number>
): Record<number, number> {
  const leg2Rounds = Array.from({ length: numRounds }, (_, i) => numRounds + 1 + i);
  if (numRounds <= 2) {
    const m: Record<number, number> = {};
    for (let r = 1; r <= numRounds; r++) {
      m[r] = numRounds + (numRounds - r + 1);
    }
    return m;
  }

  // Get or compute volatility scores for each Leg 1 round
  const leg1Rounds = Array.from({ length: numRounds }, (_, i) => {
    const r = i + 1;
    const fallbackScore = 100 - Math.abs(r - (numRounds + 1) / 2) * 5;
    return {
      round: r,
      volatility: roundVolatilities?.[r] !== undefined ? roundVolatilities[r] : fallbackScore,
    };
  });

  // Aim for a minimum gap of 5-6 rounds between leg 1 encounter and leg 2 rematch
  let minGap = Math.max(1, Math.min(6, Math.floor(numRounds / 3)));
  let bestMap: Record<number, number> | null = null;

  while (minGap >= 1 && !bestMap) {
    let seed = 1000 + numRounds * 97;
    if (pattern === 'shockwaves') seed += 1337;
    else if (pattern === 'gauntlet') seed += 2468;
    else if (pattern === 'balanced') seed += 3579;

    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let attempt = 0; attempt < 5000; attempt++) {
      let targets = [...leg2Rounds];

      // Re-order targets or shape priority based on pattern
      if (pattern === 'crescendo') {
        // High volatility -> later targets
        targets.sort((a, b) => a - b);
      } else if (pattern === 'gauntlet') {
        // High volatility -> earlier targets
        targets.sort((a, b) => b - a);
      } else if (pattern === 'shockwaves') {
        // Alternating wave structure: high and low targets interleaved
        const early = targets.filter((_, idx) => idx % 2 === 0);
        const late = targets.filter((_, idx) => idx % 2 === 1);
        targets = [];
        for (let k = 0; k < Math.max(early.length, late.length); k++) {
          if (k < late.length) targets.push(late[k]);
          if (k < early.length) targets.push(early[k]);
        }
      }

      // Add controlled jitter to explore permutations that satisfy minGap
      for (let i = targets.length - 1; i > 0; i--) {
        if (rnd() < 0.45) {
          const j = Math.floor(rnd() * (i + 1));
          const temp = targets[i];
          targets[i] = targets[j];
          targets[j] = temp;
        }
      }

      let valid = true;
      for (let r = 1; r <= numRounds; r++) {
        const assignedTarget = targets[r - 1];
        if (assignedTarget - r < minGap) {
          valid = false;
          break;
        }
      }

      if (valid) {
        let lateVol = 0;
        let earlyVol = 0;
        const midTarget = numRounds + Math.floor(numRounds / 2);
        for (let r = 1; r <= numRounds; r++) {
          const t = targets[r - 1];
          const v = leg1Rounds[r - 1].volatility;
          if (t > midTarget) lateVol += v;
          else earlyVol += v;
        }

        if (pattern === 'crescendo' && lateVol >= earlyVol) {
          bestMap = {};
          for (let r = 1; r <= numRounds; r++) bestMap[r] = targets[r - 1];
          break;
        } else if (pattern === 'gauntlet' && earlyVol >= lateVol) {
          bestMap = {};
          for (let r = 1; r <= numRounds; r++) bestMap[r] = targets[r - 1];
          break;
        } else if (pattern === 'shockwaves' || pattern === 'balanced') {
          bestMap = {};
          for (let r = 1; r <= numRounds; r++) bestMap[r] = targets[r - 1];
          break;
        }
      }
    }
    if (!bestMap) minGap--;
  }

  // Safe fallback if constraints could not be satisfied
  if (!bestMap) {
    bestMap = {};
    for (let r = 1; r <= numRounds; r++) {
      bestMap[r] = numRounds + (numRounds - r + 1);
    }
  }
  return bestMap;
}

/**
 * Generates a standard round-robin tournament schedule.
 * If team count is odd, adds a dummy BYE team so each round one team rests.
 * For double round-robin, generates an authentic asymmetric calendar for Leg 2.
 */
export function generateRoundRobinSchedule(
  teams: Team[],
  isDoubleRoundRobin: boolean = false,
  pattern: SecondLegPattern = 'crescendo'
): { matches: Match[]; byesPerRound: Record<number, string> } {
  const matches: Match[] = [];
  const byesPerRound: Record<number, string> = {};

  if (teams.length < 2) {
    return { matches, byesPerRound };
  }

  const teamList = [...teams];
  const isOdd = teamList.length % 2 !== 0;

  // If odd, we introduce a dummy ID for BYE
  const BYE_ID = 'BYE_SLOT';
  const participants = isOdd
    ? [...teamList.map((t) => t.id), BYE_ID]
    : teamList.map((t) => t.id);

  const numTeams = participants.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  let matchCounter = 1;

  // Circle / Polygon algorithm for Round-Robin (Leg 1)
  for (let round = 0; round < numRounds; round++) {
    const roundNumber = round + 1;

    for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
      const homeIdx = (round + matchIdx) % (numTeams - 1);
      let awayIdx = (numTeams - 1 - matchIdx + round) % (numTeams - 1);

      // Fix the last element
      if (matchIdx === 0) {
        awayIdx = numTeams - 1;
      }

      const teamA = participants[homeIdx];
      const teamB = participants[awayIdx];

      // Check if one is BYE
      if (teamA === BYE_ID) {
        byesPerRound[roundNumber] = teamB;
        continue;
      }
      if (teamB === BYE_ID) {
        byesPerRound[roundNumber] = teamA;
        continue;
      }

      // Alternate home/away for balance
      const isEvenRound = round % 2 === 0;
      const homeTeam = isEvenRound ? teamA : teamB;
      const awayTeam = isEvenRound ? teamB : teamA;

      matches.push({
        id: `m-r${roundNumber}-${matchIdx + 1}`,
        round: roundNumber,
        matchNumber: matchCounter++,
        homeTeamId: homeTeam,
        awayTeamId: awayTeam,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        goals: [],
      });
    }
  }

  // If double round-robin requested, create return fixtures with reversed sides and shaped Leg 2 pattern
  if (isDoubleRoundRobin) {
    const volatilities = computeLeg1RoundVolatilities(matches, teams, numRounds);
    const leg2RoundMap = generateAsymmetricRoundMapping(numRounds, pattern, volatilities);

    // Map byes asymmetrically
    for (let r = 1; r <= numRounds; r++) {
      const leg2Round = leg2RoundMap[r];
      if (byesPerRound[r]) {
        byesPerRound[leg2Round] = byesPerRound[r];
      }
    }

    // Index Leg 1 matches by their original round
    const matchesByLeg1Round = new Map<number, Match[]>();
    for (const m of matches) {
      const list = matchesByLeg1Round.get(m.round) || [];
      list.push(m);
      matchesByLeg1Round.set(m.round, list);
    }

    // Invert mapping: Leg 2 target round -> source Leg 1 round
    const leg1ByLeg2Round = new Map<number, number>();
    for (let r = 1; r <= numRounds; r++) {
      leg1ByLeg2Round.set(leg2RoundMap[r], r);
    }

    // Create Leg 2 matches sequentially by their new round (numRounds + 1 .. numRounds * 2)
    for (let leg2Round = numRounds + 1; leg2Round <= numRounds * 2; leg2Round++) {
      const sourceLeg1Round = leg1ByLeg2Round.get(leg2Round);
      if (!sourceLeg1Round) continue;

      const sourceMatches = matchesByLeg1Round.get(sourceLeg1Round) || [];
      sourceMatches.forEach((m, idx) => {
        matches.push({
          id: `m-r${leg2Round}-${idx + 1}`,
          round: leg2Round,
          matchNumber: matchCounter++,
          homeTeamId: m.awayTeamId, // reverse home and away
          awayTeamId: m.homeTeamId,
          homeScore: null,
          awayScore: null,
          status: 'scheduled',
          goals: [],
        });
      });
    }
  }

  return { matches, byesPerRound };
}

/**
 * Re-aligns unplayed Leg 2 fixtures to a designated volatility pattern.
 * Safely guards against overwriting any completed or in-progress match results.
 */
export function realignSecondLegSchedule(
  matches: Match[],
  teams: Team[],
  byesPerRound: Record<number, string>,
  pattern: SecondLegPattern = 'crescendo'
): { matches: Match[]; byesPerRound: Record<number, string>; updated: boolean; reason?: string } {
  const isOdd = teams.length % 2 !== 0;
  const numTeams = isOdd ? teams.length + 1 : teams.length;
  const numRounds = numTeams - 1;
  const totalRounds = numRounds * 2;

  const leg2Matches = matches.filter((m) => m.round > numRounds);
  if (leg2Matches.length === 0) {
    return { matches, byesPerRound, updated: false, reason: 'No second leg matches found.' };
  }

  // Safety: never touch already played or submitted Leg 2 matches
  const anyLeg2Played = leg2Matches.some(
    (m) => m.status === 'completed' || m.homeScore !== null || (m.goals && m.goals.length > 0)
  );
  if (anyLeg2Played) {
    return {
      matches,
      byesPerRound,
      updated: false,
      reason: 'Cannot re-align calendar because some 2nd leg matches have already been played.',
    };
  }

  const leg1Matches = matches.filter((m) => m.round <= numRounds);
  const volatilities = computeLeg1RoundVolatilities(matches, teams, numRounds);
  const leg2RoundMap = generateAsymmetricRoundMapping(numRounds, pattern, volatilities);
  const updatedByes: Record<number, string> = {};

  // Keep Leg 1 byes
  for (let r = 1; r <= numRounds; r++) {
    if (byesPerRound[r]) {
      updatedByes[r] = byesPerRound[r];
    }
  }

  // Map Leg 2 byes
  for (let r = 1; r <= numRounds; r++) {
    const leg2Round = leg2RoundMap[r];
    if (byesPerRound[r]) {
      updatedByes[leg2Round] = byesPerRound[r];
    }
  }

  const matchesByLeg1Round = new Map<number, Match[]>();
  for (const m of leg1Matches) {
    const list = matchesByLeg1Round.get(m.round) || [];
    list.push(m);
    matchesByLeg1Round.set(m.round, list);
  }

  const leg1ByLeg2Round = new Map<number, number>();
  for (let r = 1; r <= numRounds; r++) {
    leg1ByLeg2Round.set(leg2RoundMap[r], r);
  }

  let matchCounter = leg1Matches.length + 1;
  const newLeg2Matches: Match[] = [];

  for (let leg2Round = numRounds + 1; leg2Round <= totalRounds; leg2Round++) {
    const sourceLeg1Round = leg1ByLeg2Round.get(leg2Round);
    if (!sourceLeg1Round) continue;

    const sourceMatches = matchesByLeg1Round.get(sourceLeg1Round) || [];
    sourceMatches.forEach((m, idx) => {
      newLeg2Matches.push({
        id: `m-r${leg2Round}-${idx + 1}`,
        round: leg2Round,
        matchNumber: matchCounter++,
        homeTeamId: m.awayTeamId, // reverse home and away
        awayTeamId: m.homeTeamId,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        goals: [],
      });
    });
  }

  const finalMatches = [...leg1Matches, ...newLeg2Matches];
  return { matches: finalMatches, byesPerRound: updatedByes, updated: true };
}

/**
 * Checks if an existing double round-robin schedule has an unplayed 2nd leg
 * that is still using the old symmetric pattern, and updates it to the modern asymmetric pattern.
 */
export function reorganizeUnplayedSecondLegAsymmetric(
  matches: Match[],
  teams: Team[],
  byesPerRound: Record<number, string>,
  pattern: SecondLegPattern = 'crescendo'
): { matches: Match[]; byesPerRound: Record<number, string>; updated: boolean } {
  const isOdd = teams.length % 2 !== 0;
  const numTeams = isOdd ? teams.length + 1 : teams.length;
  const numRounds = numTeams - 1;

  // Check if matches have 2nd leg rounds
  const leg2Matches = matches.filter((m) => m.round > numRounds);
  if (leg2Matches.length === 0) {
    return { matches, byesPerRound, updated: false };
  }

  // Check if ANY 2nd leg match has been played or submitted
  const anyLeg2Played = leg2Matches.some(
    (m) => m.status === 'completed' || m.homeScore !== null || (m.goals && m.goals.length > 0)
  );
  if (anyLeg2Played) {
    return { matches, byesPerRound, updated: false };
  }

  // Check if Leg 2 is currently symmetric (i.e. round N+1 matches match round 1 reversed)
  const round1Matches = matches.filter((m) => m.round === 1);
  const roundNPlus1Matches = matches.filter((m) => m.round === numRounds + 1);

  if (round1Matches.length === 0 || roundNPlus1Matches.length === 0) {
    return { matches, byesPerRound, updated: false };
  }

  const isSymmetric = roundNPlus1Matches.every((m2) =>
    round1Matches.some((m1) => m1.homeTeamId === m2.awayTeamId && m1.awayTeamId === m2.homeTeamId)
  );

  if (!isSymmetric) {
    // Already asymmetric
    return { matches, byesPerRound, updated: false };
  }

  return realignSecondLegSchedule(matches, teams, byesPerRound, pattern);
}

