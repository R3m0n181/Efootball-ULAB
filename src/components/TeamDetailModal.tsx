import React, { useMemo, useState } from 'react';
import {
  X,
  Calendar,
  Edit3,
  Camera,
  Eye,
  Coffee,
  Zap,
  Flame,
  Castle,
  Target,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Team, Match, StandingsRow } from '../types';
import { TeamLogo } from './TeamLogo';

interface TeamDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  standingsRow: StandingsRow | null;
  matches: Match[];
  teams: Team[];
  byesPerRound?: Record<number, string>;
  totalRounds?: number;
  isAdmin?: boolean;
  onEditMatch: (match: Match) => void;
  onViewMatchDetail?: (match: Match) => void;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({
  isOpen,
  onClose,
  team,
  standingsRow,
  matches,
  teams,
  byesPerRound,
  totalRounds = 42,
  isAdmin = false,
  onEditMatch,
  onViewMatchDetail,
}) => {
  if (!isOpen || !team) return null;

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  // Matches for this team
  const teamMatches = useMemo(() => {
    return matches
      .filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
      .sort((a, b) => a.round - b.round);
  }, [matches, team.id]);

  // Unified 42-round schedule with matches & bye/rest matchdays in chronological order
  const effectiveTotalRounds = totalRounds || 42;

  const scheduleItems = useMemo(() => {
    const items: Array<
      | { type: 'match'; round: number; match: Match }
      | { type: 'bye'; round: number; isFirstLeg: boolean; isRoundFinished: boolean }
    > = [];

    for (let r = 1; r <= effectiveTotalRounds; r++) {
      const match = matches.find(
        (m) => m.round === r && (m.homeTeamId === team.id || m.awayTeamId === team.id)
      );

      if (match) {
        items.push({ type: 'match', round: r, match });
      } else {
        // Bye / Rest matchday for this team
        const roundMatches = matches.filter((m) => m.round === r);
        const isRoundFinished =
          roundMatches.length > 0 &&
          roundMatches.every((m) => m.status === 'completed');

        items.push({
          type: 'bye',
          round: r,
          isFirstLeg: r <= Math.floor(effectiveTotalRounds / 2),
          isRoundFinished,
        });
      }
    }

    return items;
  }, [matches, team.id, effectiveTotalRounds]);

  const byeRounds = useMemo(() => {
    return scheduleItems
      .filter((item): item is { type: 'bye'; round: number; isFirstLeg: boolean; isRoundFinished: boolean } => item.type === 'bye')
      .map((item) => item.round);
  }, [scheduleItems]);

  const [showRecordsSection, setShowRecordsSection] = useState(false);

  // Club-specific stats across all 5 categories
  const clubStats = useMemo(() => {
    const completed = teamMatches.filter(
      (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
    );

    let maxWinStreak = 0;
    let currWinStreak = 0;
    let maxUnbeaten = 0;
    let currUnbeaten = 0;
    let cleanSheets = 0;
    let bttsCount = 0;
    let failedToScore = 0;

    let homePlayed = 0;
    let homeWon = 0;
    let homeDrawn = 0;
    let homeLost = 0;
    let homeGF = 0;
    let homeGA = 0;
    let homePts = 0;

    let awayPlayed = 0;
    let awayWon = 0;
    let awayDrawn = 0;
    let awayLost = 0;
    let awayGF = 0;
    let awayGA = 0;
    let awayPts = 0;

    let biggestWin: { match: Match; margin: number; opponent: Team; score: string } | null = null;
    let highestScoring: { match: Match; totalGoals: number; opponent: Team; score: string } | null = null;

    completed.forEach((m) => {
      const isHome = m.homeTeamId === team.id;
      const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const oppScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
      const oppTeam = teamMap.get(opponentId) || teams[0];
      const margin = myScore - oppScore;
      const totalGoals = myScore + oppScore;

      // Streaks
      if (myScore > oppScore) {
        currWinStreak += 1;
        if (currWinStreak > maxWinStreak) maxWinStreak = currWinStreak;
      } else {
        currWinStreak = 0;
      }

      if (myScore >= oppScore) {
        currUnbeaten += 1;
        if (currUnbeaten > maxUnbeaten) maxUnbeaten = currUnbeaten;
      } else {
        currUnbeaten = 0;
      }

      // Efficiency
      if (oppScore === 0) cleanSheets += 1;
      if (myScore > 0 && oppScore > 0) bttsCount += 1;
      if (myScore === 0) failedToScore += 1;

      // Home vs Away
      if (isHome) {
        homePlayed += 1;
        homeGF += myScore;
        homeGA += oppScore;
        if (myScore > oppScore) { homeWon += 1; homePts += 3; }
        else if (myScore === oppScore) { homeDrawn += 1; homePts += 1; }
        else { homeLost += 1; }
      } else {
        awayPlayed += 1;
        awayGF += myScore;
        awayGA += oppScore;
        if (myScore > oppScore) { awayWon += 1; awayPts += 3; }
        else if (myScore === oppScore) { awayDrawn += 1; awayPts += 1; }
        else { awayLost += 1; }
      }

      // Biggest Win
      if (margin > 0 && (!biggestWin || margin > biggestWin.margin)) {
        biggestWin = {
          match: m,
          margin,
          opponent: oppTeam,
          score: `${myScore} - ${oppScore}`,
        };
      }

      // Highest scoring match
      if (!highestScoring || totalGoals > highestScoring.totalGoals) {
        highestScoring = {
          match: m,
          totalGoals,
          opponent: oppTeam,
          score: `${m.homeScore} - ${m.awayScore}`,
        };
      }
    });

    const totalScheduled = 40;
    const played = completed.length;
    const points = homePts + awayPts;
    const remaining = Math.max(0, totalScheduled - played);
    const maxPointsCeiling = points + remaining * 3;

    return {
      completedCount: completed.length,
      maxWinStreak,
      currWinStreak,
      maxUnbeaten,
      currUnbeaten,
      cleanSheets,
      cleanSheetPct: played > 0 ? Math.round((cleanSheets / played) * 100) : 0,
      bttsPct: played > 0 ? Math.round((bttsCount / played) * 100) : 0,
      failedToScorePct: played > 0 ? Math.round((failedToScore / played) * 100) : 0,
      home: {
        played: homePlayed,
        record: `${homeWon}W ${homeDrawn}D ${homeLost}L`,
        points: homePts,
        ppg: homePlayed > 0 ? (homePts / homePlayed).toFixed(2) : '0.00',
        gfGa: `${homeGF}:${homeGA}`,
      },
      away: {
        played: awayPlayed,
        record: `${awayWon}W ${awayDrawn}D ${awayLost}L`,
        points: awayPts,
        ppg: awayPlayed > 0 ? (awayPts / awayPlayed).toFixed(2) : '0.00',
        gfGa: `${awayGF}:${awayGA}`,
      },
      biggestWin,
      highestScoring,
      maxPointsCeiling,
    };
  }, [teamMatches, team.id, teamMap, teams]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f1219] border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header with Team Branding - Club Name First, Player Below */}
        <div
          className="p-3.5 sm:p-4 relative border-b border-slate-800 flex items-start justify-between text-white"
          style={{
            background: `linear-gradient(135deg, ${team.color}35 0%, #0a0c10 100%)`,
          }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <TeamLogo team={team} size="lg" className="border border-white/20 shadow-lg shrink-0" />
            <div className="min-w-0">
              {/* Club Name First */}
              <h3 className="text-base sm:text-xl font-black truncate">{team.clubName}</h3>
              {/* Player Name Below */}
              <p className="text-xs text-slate-300 font-medium truncate">
                Player / Manager: <span className="text-white font-semibold">{team.managerName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              aria-label="Close team details"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        {standingsRow && (
          <div className="bg-[#0a0c10] px-4 py-2.5 border-b border-slate-800 grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-xs">
            <div>
              <div className="text-[9px] text-slate-500 uppercase">Rank</div>
              <div className="text-sm font-black font-mono text-emerald-400">#{standingsRow.rank}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">PTS</div>
              <div className="text-sm font-black font-mono text-white">{standingsRow.points}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">Played</div>
              <div className="text-sm font-bold font-mono text-slate-300">{standingsRow.played}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">W - D - L</div>
              <div className="text-[11px] font-bold font-mono text-slate-300 mt-0.5">
                {standingsRow.won}-{standingsRow.drawn}-{standingsRow.lost}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">GF / GA</div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                {standingsRow.goalsFor} / {standingsRow.goalsAgainst}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">GD</div>
              <div className="text-[11px] font-bold font-mono text-emerald-400 mt-0.5">
                {standingsRow.goalDifference > 0 ? `+${standingsRow.goalDifference}` : standingsRow.goalDifference}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">Clean Sheets</div>
              <div className="text-sm font-bold font-mono text-indigo-400">{standingsRow.cleanSheets}</div>
            </div>
          </div>
        )}

        {/* Recent Form Banner */}
        {standingsRow && standingsRow.form.length > 0 && (
          <div className="bg-[#0a0c10]/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Recent Form (Last 5)
            </span>
            <div className="flex items-center gap-1.5">
              {standingsRow.recentMatches.map((match, idx) => (
                <span
                  key={idx}
                  title={`${match.isHome ? 'vs' : '@'} ${match.opponentShortCode} (${match.score})`}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono ${
                    match.result === 'W'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : match.result === 'D'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {match.result}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Club Records & Performance Metrics Card (5 Pillars) - Collapsible, Closed by default */}
          <div className="bg-[#0a0c10] border border-slate-800/90 rounded-xl overflow-hidden shadow-md">
            <div
              id="team-toggle-records"
              onClick={() => setShowRecordsSection(!showRecordsSection)}
              className="px-3.5 py-2.5 bg-[#0f1219] hover:bg-[#141822] flex items-center justify-between cursor-pointer transition select-none"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-slate-200 text-xs tracking-wide">
                  Club Records &amp; Performance Highlights
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono font-bold">
                  STATS
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-[10px] hidden sm:inline">
                  {showRecordsSection ? 'Hide' : 'Show'}
                </span>
                {showRecordsSection ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {showRecordsSection && (
              <div className="p-3 sm:p-3.5 space-y-2.5 sm:space-y-3 border-t border-slate-800/80">
                {/* 4 Pillars Mini Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {/* Biggest Win */}
                  <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/90 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">Biggest Win</span>
                    </div>
                    {clubStats.biggestWin ? (
                      <div className="mt-1.5">
                        <div className="text-xs sm:text-sm font-black text-white font-mono flex items-baseline gap-1.5">
                          <span className="text-emerald-400">+{clubStats.biggestWin.margin}</span>
                          <span className="text-slate-300 font-bold">({clubStats.biggestWin.score})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          vs <span className="text-slate-200 font-semibold">{clubStats.biggestWin.opponent.shortCode}</span> <span className="text-slate-500 font-mono">(MD {clubStats.biggestWin.match.round})</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic mt-2">None yet</div>
                    )}
                  </div>

                  {/* Highest Scoring Match */}
                  <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/90 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">High Score Match</span>
                    </div>
                    {clubStats.highestScoring ? (
                      <div className="mt-1.5">
                        <div className="text-xs sm:text-sm font-black text-amber-300 font-mono flex items-baseline gap-1.5">
                          <span>{clubStats.highestScoring.totalGoals} Goals</span>
                          <span className="text-slate-400 font-normal text-[11px]">({clubStats.highestScoring.score})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          vs <span className="text-slate-200 font-semibold">{clubStats.highestScoring.opponent.shortCode}</span> <span className="text-slate-500 font-mono">(MD {clubStats.highestScoring.match.round})</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic mt-2">None yet</div>
                    )}
                  </div>

                  {/* Best Streaks */}
                  <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/90 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">Form Streaks</span>
                    </div>
                    <div className="mt-1.5">
                      <div className="text-xs sm:text-sm font-black text-cyan-300 font-mono">
                        {clubStats.maxWinStreak}W <span className="text-slate-500 font-normal text-[10px]">peak</span> • {clubStats.maxUnbeaten} <span className="text-slate-500 font-normal text-[10px]">unbeaten</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        Active:{' '}
                        <span className="font-semibold text-slate-200 font-mono">
                          {clubStats.currWinStreak > 0
                            ? `${clubStats.currWinStreak}W Win Streak`
                            : clubStats.currUnbeaten > 0
                            ? `${clubStats.currUnbeaten} Unbeaten`
                            : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Max Points Ceiling */}
                  <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/90 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      <Trophy className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Points Ceiling</span>
                    </div>
                    <div className="mt-1.5">
                      <div className="text-xs sm:text-sm font-black text-indigo-300 font-mono">
                        {clubStats.maxPointsCeiling} PTS <span className="text-slate-500 font-normal text-[10px]">Max</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        <span className="font-mono text-slate-300 font-semibold">{Math.max(0, 40 - clubStats.completedCount)}</span> matches remaining
                      </div>
                    </div>
                  </div>
                </div>

                {/* Home vs Away & Rates Stack */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  {/* Home vs Away Fortress */}
                  <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/90 space-y-2">
                    <div className="flex items-center justify-between text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5 text-[10px] uppercase text-emerald-400 font-black tracking-wider">
                        <Castle className="w-3.5 h-3.5" /> Home vs Away Splits
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      {/* Home */}
                      <div className="bg-[#0a0c10] p-2 rounded-lg border border-emerald-500/25 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">Home</span>
                            <span className="text-[9px] text-slate-500">{clubStats.home.played}P</span>
                          </div>
                          <div className="font-black text-white text-xs sm:text-sm mt-0.5">{clubStats.home.record}</div>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-300 space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Pts:</span>
                            <span className="font-bold text-emerald-300">{clubStats.home.points} ({clubStats.home.ppg} PPG)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">GF:GA:</span>
                            <span className="text-slate-300">{clubStats.home.gfGa}</span>
                          </div>
                        </div>
                      </div>

                      {/* Away */}
                      <div className="bg-[#0a0c10] p-2 rounded-lg border border-cyan-500/25 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wide">Away</span>
                            <span className="text-[9px] text-slate-500">{clubStats.away.played}P</span>
                          </div>
                          <div className="font-black text-white text-xs sm:text-sm mt-0.5">{clubStats.away.record}</div>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-300 space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Pts:</span>
                            <span className="font-bold text-cyan-300">{clubStats.away.points} ({clubStats.away.ppg} PPG)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">GF:GA:</span>
                            <span className="text-slate-300">{clubStats.away.gfGa}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Efficiency Rates */}
                  <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/90 space-y-2">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase text-cyan-400 font-black tracking-wider">
                      <Target className="w-3.5 h-3.5" /> Efficiency &amp; Rates
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                      <div className="bg-[#0a0c10] p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-tight">Clean Sheet</div>
                        <div className="font-black text-cyan-300 text-xs sm:text-sm my-1">{clubStats.cleanSheetPct}%</div>
                        <div className="text-[9px] text-slate-500">{clubStats.cleanSheets} CS</div>
                      </div>
                      <div className="bg-[#0a0c10] p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-tight">BTTS Rate</div>
                        <div className="font-black text-amber-300 text-xs sm:text-sm my-1">{clubStats.bttsPct}%</div>
                        <div className="text-[9px] text-slate-500">Both scored</div>
                      </div>
                      <div className="bg-[#0a0c10] p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-tight">Failed To Score</div>
                        <div className="font-black text-rose-300 text-xs sm:text-sm my-1">{clubStats.failedToScorePct}%</div>
                        <div className="text-[9px] text-slate-500">0 goals scored</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Full Match Fixture Schedule (Non-collapsible, as earlier) */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Home &amp; Away Fixture Schedule</span>
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  {teamMatches.filter((m) => m.status === 'completed').length} / {teamMatches.length} completed
                </span>
              </div>
            </div>

            {/* Rest / Bye Matchdays Notice Banner */}
            {byeRounds.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs text-amber-200">
                <Coffee className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <span className="text-amber-300 font-bold uppercase tracking-wide">Rest / Bye Matchdays:</span>{' '}
                  {byeRounds.map((roundNum, idx) => {
                    const isFirst = roundNum <= Math.floor(effectiveTotalRounds / 2);
                    return (
                      <span key={roundNum} className="inline-flex items-center gap-1">
                        <strong className="text-white font-mono bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 rounded">
                          MD {roundNum}
                        </strong>
                        <span className="text-amber-300/80">({isFirst ? 'First Leg' : 'Return Leg'})</span>
                        {idx < byeRounds.length - 1 ? <span className="text-amber-500/60 mr-1">•</span> : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {scheduleItems.map((item) => {
                if (item.type === 'bye') {
                  return (
                    <div
                      key={`bye-${item.round}`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-lg bg-[#0a0c10]/70 border border-dashed border-amber-500/30 text-xs transition gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-amber-400 font-bold shrink-0">
                          MD {item.round}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Coffee className="w-2.5 h-2.5 text-amber-400" />
                          <span>REST / BYE</span>
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <strong className="text-amber-200/90 text-xs truncate">
                            Rest Matchday
                          </strong>
                          <span className="text-slate-400 text-[10px] truncate hidden xs:inline">
                            • No fixture for {team.clubName} ({item.isFirstLeg ? '1st Leg' : '2nd Leg'})
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        {item.isRoundFinished ? (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                            MD Completed
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-medium text-amber-300/90 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                            Scheduled Rest
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                const match = item.match;
                const isHome = match.homeTeamId === team.id;
                const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
                const opponent = teamMap.get(opponentId);
                const isCompleted =
                  match.status === 'completed' && match.homeScore !== null && match.awayScore !== null;

                let resultTag: 'W' | 'D' | 'L' | null = null;
                if (isCompleted) {
                  const teamScore = isHome ? match.homeScore! : match.awayScore!;
                  const oppScore = isHome ? match.awayScore! : match.homeScore!;
                  if (teamScore > oppScore) resultTag = 'W';
                  else if (teamScore < oppScore) resultTag = 'L';
                  else resultTag = 'D';
                }

                const hasAction = isCompleted || isAdmin;
                const handleRowClick = () => {
                  if (isCompleted && onViewMatchDetail) {
                    onViewMatchDetail(match);
                  } else if (!isCompleted && isAdmin) {
                    onEditMatch(match);
                  }
                };

                return (
                  <div
                    key={match.id}
                    onClick={hasAction ? handleRowClick : undefined}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-lg bg-[#0a0c10] border border-slate-800 text-xs transition gap-2 sm:gap-3 ${
                      hasAction
                        ? 'hover:border-emerald-500/50 cursor-pointer group'
                        : 'cursor-default'
                    }`}
                  >
                    {/* Line 1: Match metadata, teams & score/status */}
                    <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-slate-500 shrink-0">
                          MD {match.round}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                          isHome ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isHome ? 'H' : 'A'}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {opponent && <TeamLogo team={opponent} size="md" />}
                          <strong className={`text-white text-xs transition truncate ${
                            hasAction ? 'group-hover:text-emerald-400' : ''
                          }`}>
                            {opponent?.clubName}
                          </strong>
                          <span className="text-slate-400 text-[10px] truncate hidden xs:inline">
                            ({opponent?.managerName})
                          </span>
                        </div>
                      </div>

                      {/* Mobile-only Score / Status on right of Line 1 */}
                      <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                        {match.screenshotUrl && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-1 py-0.2 rounded font-mono">
                            <Camera className="w-2.5 h-2.5" />
                            SS
                          </span>
                        )}

                        {isCompleted ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[9px] ${
                                resultTag === 'W'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : resultTag === 'D'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {resultTag}
                            </span>
                            <span className="font-mono font-bold text-white text-xs">
                              {match.homeScore} - {match.awayScore}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Scheduled</span>
                        )}
                      </div>
                    </div>

                    {/* Actions / Details: Rendered when completed (View Details) or for admin (Submit) */}
                    {(isCompleted || isAdmin) ? (
                      <div className="flex items-center justify-end w-full sm:w-auto pt-2 border-t border-slate-800/80 sm:border-t-0 sm:pt-0 gap-2">
                        {/* Desktop only score & SS badge */}
                        <div className="hidden sm:flex items-center gap-2">
                          {match.screenshotUrl && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                              <Camera className="w-2.5 h-2.5" />
                              SS
                            </span>
                          )}

                          {isCompleted ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[9px] ${
                                  resultTag === 'W'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : resultTag === 'D'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {resultTag}
                              </span>
                              <span className="font-mono font-bold text-white text-xs">
                                {match.homeScore} - {match.awayScore}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Scheduled</span>
                          )}
                        </div>

                        {/* Button: View Details for completed matches, Submit for unplayed matches by Admin */}
                        {isCompleted ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onViewMatchDetail) {
                                onViewMatchDetail(match);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 sm:py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-emerald-300 transition text-[11px] sm:text-[10px] font-semibold cursor-pointer active:scale-95"
                            title="View Match Details & SS"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-emerald-400" />
                            <span>View Details</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditMatch(match);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 sm:py-0.5 rounded bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold transition text-[11px] sm:text-[10px] shadow-sm shadow-emerald-500/20 cursor-pointer active:scale-95"
                            title="Submit Match Result"
                          >
                            <Edit3 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                            <span>Submit</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Non-admin on desktop unplayed match: Show clean status on right side without button */
                      <div className="hidden sm:flex items-center justify-end">
                        <span className="text-[10px] text-slate-500 italic">Scheduled</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
