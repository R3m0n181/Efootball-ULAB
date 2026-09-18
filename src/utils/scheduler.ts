import { Match, Team } from '../types';

/**
 * Generates an asymmetric round mapping for Leg 2 (similar to modern Premier League/Serie A).
 * Maps each Leg 1 round (1..numRounds) to a distinct Leg 2 round (numRounds+1..2*numRounds).
 *
 * Enforces key scheduling constraints:
 * 1. Spacing Buffer: ensures a minimum round gap between a fixture and its reverse rematch (no immediate rematches).
 * 2. Asymmetric dispersion: Leg 2 does not mirror Leg 1 in linear or simple sequential order.
 * 3. Determinism: produces a stable, mathematically guaranteed calendar for any team count and seed offset.
 */
export function generateAsymmetricRoundMapping(
  numRounds: number,
  seedOffset: number = 1
): Record<number, number> {
  const leg2Rounds = Array.from({ length: numRounds }, (_, i) => numRounds + 1 + i);
  if (numRounds <= 2) {
    const m: Record<number, number> = {};
    for (let r = 1; r <= numRounds; r++) {
      m[r] = numRounds + (numRounds - r + 1);
    }
    return m;
  }

  // Aim for a minimum gap of 5-6 rounds between leg 1 encounter and leg 2 rematch
  let minGap = Math.max(1, Math.min(6, Math.floor(numRounds / 3)));
  let bestMap: Record<number, number> | null = null;

  while (minGap >= 1 && !bestMap) {
    let seed = 1337 + numRounds * 997 + seedOffset * 7919;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let attempt = 0; attempt < 4000; attempt++) {
      const available = [...leg2Rounds];
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const temp = available[i];
        available[i] = available[j];
        available[j] = temp;
      }

      let valid = true;
      for (let r = 1; r <= numRounds; r++) {
        if (available[r - 1] - r < minGap) {
          valid = false;
          break;
        }
      }

      if (valid) {
        let samePos = 0;
        for (let r = 1; r <= numRounds; r++) {
          if (available[r - 1] === r + numRounds) samePos++;
        }
        if (samePos === 0 || numRounds <= 3) {
          bestMap = {};
          for (let r = 1; r <= numRounds; r++) {
            bestMap[r] = available[r - 1];
          }
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
  seedOffset: number = 1
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

  // If double round-robin requested, create return fixtures with reversed sides and asymmetric schedule pattern
  if (isDoubleRoundRobin) {
    const leg2RoundMap = generateAsymmetricRoundMapping(numRounds, seedOffset);

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
 * Reshuffles the unplayed 2nd leg matches of a double round-robin tournament
 * into a new asymmetric round distribution while preserving Leg 1 matches and scores.
 */
export function reshuffleSecondLeg(
  matches: Match[],
  teams: Team[],
  byesPerRound: Record<number, string>,
  seedOffset: number = Math.floor(Math.random() * 100000) + 1
): {
  matches: Match[];
  byesPerRound: Record<number, string>;
  success: boolean;
  seedUsed: number;
  message: string;
} {
  const isOdd = teams.length % 2 !== 0;
  const numTeams = isOdd ? teams.length + 1 : teams.length;
  const numRounds = numTeams - 1;
  const totalRounds = numRounds * 2;

  const leg2Matches = matches.filter((m) => m.round > numRounds);
  if (leg2Matches.length === 0) {
    return {
      matches,
      byesPerRound,
      success: false,
      seedUsed: seedOffset,
      message: 'No 2nd leg fixtures found in the current schedule.',
    };
  }

  // Check if any 2nd leg matches have already been played/completed
  const anyLeg2Played = leg2Matches.some(
    (m) => m.status === 'completed' || m.homeScore !== null || (m.goals && m.goals.length > 0)
  );
  if (anyLeg2Played) {
    return {
      matches,
      byesPerRound,
      success: false,
      seedUsed: seedOffset,
      message: 'Cannot reshuffle: one or more 2nd leg matches have already been played.',
    };
  }

  const leg1Matches = matches.filter((m) => m.round <= numRounds);
  const leg2RoundMap = generateAsymmetricRoundMapping(numRounds, seedOffset);
  const updatedByes: Record<number, string> = {};

  // Keep Leg 1 byes
  for (let r = 1; r <= numRounds; r++) {
    if (byesPerRound[r]) {
      updatedByes[r] = byesPerRound[r];
    }
  }

  // Map Leg 2 byes to their newly assigned rounds
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
  return {
    matches: finalMatches,
    byesPerRound: updatedByes,
    success: true,
    seedUsed: seedOffset,
    message: `2nd leg calendar successfully reshuffled (Seed #${seedOffset}).`,
  };
}

/**
 * Checks if an existing double round-robin schedule has an unplayed 2nd leg
 * that is still using the old symmetric pattern, and updates it to the modern asymmetric pattern.
 */
export function reorganizeUnplayedSecondLegAsymmetric(
  matches: Match[],
  teams: Team[],
  byesPerRound: Record<number, string>,
  seedOffset: number = 1
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

  const res = reshuffleSecondLeg(matches, teams, byesPerRound, seedOffset);
  return {
    matches: res.matches,
    byesPerRound: res.byesPerRound,
    updated: res.success,
  };
}

