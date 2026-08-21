import { Match, Team } from '../types';

/**
 * Generates a standard round-robin tournament schedule.
 * If team count is odd, adds a dummy BYE team so each round one team rests.
 */
export function generateRoundRobinSchedule(
  teams: Team[],
  isDoubleRoundRobin: boolean = false
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

  // Circle / Polygon algorithm for Round-Robin
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

  // If double round-robin requested, create return fixtures with reversed sides
  if (isDoubleRoundRobin) {
    const firstLegMatches = [...matches];
    const offsetRound = numRounds;

    for (let r = 1; r <= numRounds; r++) {
      const secondRoundNum = r + offsetRound;
      if (byesPerRound[r]) {
        byesPerRound[secondRoundNum] = byesPerRound[r];
      }
    }

    firstLegMatches.forEach((m) => {
      const returnRound = m.round + offsetRound;
      matches.push({
        id: `m-r${returnRound}-${m.matchNumber}`,
        round: returnRound,
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

  return { matches, byesPerRound };
}
