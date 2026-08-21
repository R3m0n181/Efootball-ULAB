import { Match, Team } from '../types';

// Creates a realistic mock eFootball match result screen preview
function createMockScreenshot(homeName: string, awayName: string, hScore: number, aScore: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16"/>
        <stop offset="50%" stop-color="#111827"/>
        <stop offset="100%" stop-color="#06090e"/>
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8"/>
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#bg)"/>
    <circle cx="400" cy="225" r="300" fill="#10b981" opacity="0.04"/>
    <path d="M 0,0 L 800,0 L 800,8 L 0,8 Z" fill="url(#glow)"/>
    
    <!-- eFootball Watermark Banner -->
    <rect x="30" y="25" width="130" height="28" rx="6" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-opacity="0.4"/>
    <text x="95" y="44" fill="#34d399" font-family="system-ui, sans-serif" font-size="12" font-weight="900" text-anchor="middle" letter-spacing="1">eFootball™ 2026</text>
    <text x="760" y="44" fill="#64748b" font-family="system-ui, sans-serif" font-size="12" font-weight="700" text-anchor="end">MATCH RESULT • FULL TIME</text>

    <!-- Scoreboard Center -->
    <rect x="250" y="100" width="300" height="130" rx="16" fill="#030712" stroke="#1e293b" stroke-width="2"/>
    <text x="330" y="185" fill="#f8fafc" font-family="monospace, sans-serif" font-size="64" font-weight="900" text-anchor="middle">${hScore}</text>
    <text x="400" y="180" fill="#475569" font-family="monospace, sans-serif" font-size="44" font-weight="900" text-anchor="middle">:</text>
    <text x="470" y="185" fill="#f8fafc" font-family="monospace, sans-serif" font-size="64" font-weight="900" text-anchor="middle">${aScore}</text>
    <text x="400" y="215" fill="#10b981" font-family="system-ui, sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="2">MATCH COMPLETED</text>

    <!-- Home Team -->
    <text x="140" y="160" fill="#ffffff" font-family="system-ui, sans-serif" font-size="22" font-weight="800" text-anchor="middle">${homeName}</text>
    <text x="140" y="185" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">HOME TEAM</text>

    <!-- Away Team -->
    <text x="660" y="160" fill="#ffffff" font-family="system-ui, sans-serif" font-size="22" font-weight="800" text-anchor="middle">${awayName}</text>
    <text x="660" y="185" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">AWAY TEAM</text>

    <!-- Stats Table Section -->
    <rect x="60" y="260" width="680" height="150" rx="12" fill="#090d16" stroke="#1e293b"/>
    <text x="400" y="285" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">OFFICIAL MATCH STATS</text>
    
    <!-- Possession -->
    <text x="100" y="315" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13" font-weight="600">54%</text>
    <text x="400" y="315" fill="#64748b" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">Possession</text>
    <text x="700" y="315" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13" font-weight="600" text-anchor="end">46%</text>

    <!-- Shots on Target -->
    <text x="100" y="348" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13" font-weight="600">${hScore + 4} (6)</text>
    <text x="400" y="348" fill="#64748b" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">Shots (On Target)</text>
    <text x="700" y="348" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13" font-weight="600" text-anchor="end">${aScore + 3} (4)</text>

    <!-- Pass Accuracy -->
    <text x="100" y="380" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13" font-weight="600">86%</text>
    <text x="400" y="380" fill="#64748b" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">Pass Accuracy</text>
    <text x="700" y="380" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13" font-weight="600" text-anchor="end">81%</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function seedSampleMatches(matches: Match[], teams: Team[]): Match[] {
  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  // Let's seed completed matches for Round 1
  return matches.map((match) => {
    if (match.round === 1) {
      const hTeam = teamMap.get(match.homeTeamId);
      const aTeam = teamMap.get(match.awayTeamId);

      // Generate a realistic scoreline based on matchNumber
      let homeScore = 2;
      let awayScore = 1;
      let notes = 'Competitive fixture with tight midfield battle.';

      if (match.matchNumber % 4 === 0) {
        homeScore = 3;
        awayScore = 0;
        notes = 'Dominant performance with clean sheet defense.';
      } else if (match.matchNumber % 3 === 0) {
        homeScore = 2;
        awayScore = 2;
        notes = 'Thrilling 4-goal draw with late equalizer in 88th min.';
      } else if (match.matchNumber % 2 === 0) {
        homeScore = 1;
        awayScore = 2;
        notes = 'Away victory secured via counter-attack masterclass.';
      }

      const screenshotUrl = hTeam && aTeam ? createMockScreenshot(hTeam.shortCode, aTeam.shortCode, homeScore, awayScore) : undefined;

      return {
        ...match,
        homeScore,
        awayScore,
        status: 'completed',
        playedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        notes,
        screenshotUrl,
      };
    }

    return match;
  });
}

