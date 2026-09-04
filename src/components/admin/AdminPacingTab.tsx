import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Flame,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Match, Team, TournamentConfig } from '../../types';
import { TeamLogo } from '../TeamLogo';

interface AdminPacingTabProps {
  matches: Match[];
  teams: Team[];
  config: TournamentConfig;
  onViewMatchDetail?: (match: Match) => void;
  onSelectTeam?: (team: Team) => void;
  onNavigateToManagerLog?: () => void;
}

export const AdminPacingTab: React.FC<AdminPacingTabProps> = ({
  matches,
  teams,
  config,
  onViewMatchDetail,
  onSelectTeam,
  onNavigateToManagerLog,
}) => {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [copiedLaggingText, setCopiedLaggingText] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active' | 'unstarted'>('all');
  const [pendingOpenMap, setPendingOpenMap] = useState<Record<number, boolean>>({});
  const [finishedOpenMap, setFinishedOpenMap] = useState<Record<number, boolean>>({});

  const togglePending = (roundNum: number) => {
    setPendingOpenMap((prev) => {
      const current = prev[roundNum] !== undefined ? prev[roundNum] : true;
      return { ...prev, [roundNum]: !current };
    });
  };

  const toggleFinished = (roundNum: number, defaultOpen: boolean) => {
    setFinishedOpenMap((prev) => {
      const current = prev[roundNum] !== undefined ? prev[roundNum] : defaultOpen;
      return { ...prev, [roundNum]: !current };
    });
  };

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  // Group matches by round
  const roundStats = useMemo(() => {
    const totalRounds = (teams.length - 1) * 2; // Home & Away
    const roundsMap = new Map<
      number,
      {
        round: number;
        matches: Match[];
        total: number;
        completed: number;
        pending: number;
        goals: number;
        percent: number;
      }
    >();

    // Initialize all rounds
    for (let r = 1; r <= totalRounds; r++) {
      roundsMap.set(r, {
        round: r,
        matches: [],
        total: 0,
        completed: 0,
        pending: 0,
        goals: 0,
        percent: 0,
      });
    }

    matches.forEach((m) => {
      let rStat = roundsMap.get(m.round);
      if (!rStat) {
        rStat = {
          round: m.round,
          matches: [],
          total: 0,
          completed: 0,
          pending: 0,
          goals: 0,
          percent: 0,
        };
        roundsMap.set(m.round, rStat);
      }
      rStat.matches.push(m);
      rStat.total += 1;
      if (m.status === 'completed' && m.homeScore !== null && m.awayScore !== null) {
        rStat.completed += 1;
        rStat.goals += (m.homeScore || 0) + (m.awayScore || 0);
      } else {
        rStat.pending += 1;
      }
    });

    const list = Array.from(roundsMap.values()).map((r) => {
      // Sort matches so pending matches appear first, then finished matches
      const sortedMatches = [...r.matches].sort((a, b) => {
        const aDone = a.status === 'completed' && a.homeScore !== null && a.awayScore !== null;
        const bDone = b.status === 'completed' && b.homeScore !== null && b.awayScore !== null;
        if (aDone !== bDone) {
          return aDone ? 1 : -1; // Pending (false) first, completed (true) last
        }
        return (a.matchNumber || 0) - (b.matchNumber || 0);
      });

      return {
        ...r,
        matches: sortedMatches,
        percent: r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0,
      };
    });

    list.sort((a, b) => a.round - b.round);
    return list;
  }, [matches, teams.length]);

  // Overall pacing statistics
  const overall = useMemo(() => {
    const completedRounds = roundStats.filter((r) => r.percent === 100).length;
    const activeRounds = roundStats.filter((r) => r.percent > 0 && r.percent < 100).length;
    const unstartedRounds = roundStats.filter((r) => r.completed === 0).length;

    // Find earliest lagging round (earliest round with incomplete matches)
    const laggingRound = roundStats.find((r) => r.pending > 0);

    // Find highest scoring round
    let highestScoringRound = roundStats[0];
    roundStats.forEach((r) => {
      if (r.goals > (highestScoringRound?.goals || 0)) {
        highestScoringRound = r;
      }
    });

    return {
      completedRounds,
      activeRounds,
      unstartedRounds,
      laggingRound,
      highestScoringRound,
    };
  }, [roundStats]);

  // Filtered rounds list
  const filteredRounds = useMemo(() => {
    if (statusFilter === 'completed') {
      return roundStats.filter((r) => r.percent === 100);
    }
    if (statusFilter === 'active') {
      return roundStats.filter((r) => r.percent > 0 && r.percent < 100);
    }
    if (statusFilter === 'unstarted') {
      return roundStats.filter((r) => r.completed === 0);
    }
    return roundStats;
  }, [roundStats, statusFilter]);

  // Copy lagging round announcement
  const handleCopyLaggingAnnouncement = () => {
    if (!overall.laggingRound) return;
    const pendingMatches = overall.laggingRound.matches.filter(
      (m) => m.status !== 'completed' || m.homeScore === null
    );

    const lines = [
      `🚨 *${config.name} — Round ${overall.laggingRound.round} Pending Matches Alert* 🚨`,
      `Round ${overall.laggingRound.round} is currently holding up tournament progression (${overall.laggingRound.completed}/${overall.laggingRound.total} matches played, ${overall.laggingRound.percent}% complete).`,
      '',
      '*Pending Fixtures to be played:*',
      ...pendingMatches.map((m) => {
        const home = teamMap.get(m.homeTeamId);
        const away = teamMap.get(m.awayTeamId);
        return `• ${home?.clubName || 'Home'} (${home?.managerName || 'TBD'}) vs ${away?.clubName || 'Away'} (${away?.managerName || 'TBD'})`;
      }),
      '',
      '👉 Managers, please coordinate and submit your match results with screenshot proof as soon as possible!',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedLaggingText(true);
    setTimeout(() => setCopiedLaggingText(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* 4 Pacing Snapshot Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Rounds Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {overall.completedRounds}{' '}
            <span className="text-xs font-normal text-slate-400">/ {roundStats.length}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {Math.round((overall.completedRounds / (roundStats.length || 1)) * 100)}% of tournament rounds finished
          </div>
        </div>

        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Active Rounds</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">{overall.activeRounds}</div>
          <div className="text-[11px] text-slate-400 mt-1">Currently in progress across clubs</div>
        </div>

        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Lagging Gameweek</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {overall.laggingRound ? `Round ${overall.laggingRound.round}` : 'None'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {overall.laggingRound ? `${overall.laggingRound.pending} unplayed fixtures` : 'All rounds complete!'}
          </div>
        </div>

        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Peak Action Round</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {overall.highestScoringRound ? `R${overall.highestScoringRound.round}` : '-'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {overall.highestScoringRound ? `${overall.highestScoringRound.goals} goals recorded` : 'No goals yet'}
          </div>
        </div>
      </div>

      {/* Lagging Round Bottleneck Spotlight */}
      {overall.laggingRound && (
        <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">
                  Progression Bottleneck: Round {overall.laggingRound.round}
                </h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  This is the earliest incomplete round. {overall.laggingRound.pending} unplayed match
                  {overall.laggingRound.pending > 1 ? 'es are' : ' is'} holding up clean round closure.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
              {onNavigateToManagerLog && (
                <button
                  onClick={onNavigateToManagerLog}
                  className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Open full backlog directory in Manager Log"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Manager Log</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              )}

              <button
                onClick={handleCopyLaggingAnnouncement}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedLaggingText ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedLaggingText ? 'Copied Nudge!' : 'Copy Round Nudge'}</span>
              </button>
            </div>
          </div>

          {/* Pending matches inside lagging round */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {overall.laggingRound.matches
              .filter((m) => m.status !== 'completed' || m.homeScore === null)
              .map((match) => {
                const home = teamMap.get(match.homeTeamId);
                const away = teamMap.get(match.awayTeamId);

                return (
                  <div
                    key={match.id}
                    onClick={() => onViewMatchDetail?.(match)}
                    className="p-3 rounded-xl bg-[#0d1017] border border-slate-800 hover:border-amber-500/50 hover:bg-[#121622] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0 flex-1">
                      {/* Home */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <TeamLogo team={home} size="xs" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-200 block truncate">
                            {home?.clubName || 'Home'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            @{home?.managerName || 'TBD'}
                          </span>
                        </div>
                      </div>

                      {/* Center VS */}
                      <div className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                        VS
                      </div>

                      {/* Away */}
                      <div className="flex items-center justify-end sm:justify-start gap-2 min-w-0 flex-1 text-right sm:text-left">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-200 block truncate">
                            {away?.clubName || 'Away'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            @{away?.managerName || 'TBD'}
                          </span>
                        </div>
                        <TeamLogo team={away} size="xs" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-800/80 pt-1.5 sm:pt-0">
                      <span className="text-[10px] text-slate-500 sm:hidden">Fixture Status:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          Unplayed
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 sm:hidden" />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Round Pacing List & Progress Bars */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-slate-800 bg-[#0a0c10] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Round-by-Round Pacing Breakdown
            </h3>
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({roundStats.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'active'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({overall.activeRounds})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'completed'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200'
              }`}
            >
              Completed ({overall.completedRounds})
            </button>
            <button
              onClick={() => setStatusFilter('unstarted')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'unstarted'
                  ? 'bg-slate-700 text-white border border-slate-600'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200'
              }`}
            >
              Unstarted ({overall.unstartedRounds})
            </button>
          </div>
        </div>

        {/* Rounds list */}
        <div className="divide-y divide-slate-800/80">
          {filteredRounds.map((r) => {
            const isExpanded = expandedRound === r.round;
            const isCompleted = r.percent === 100;
            const isActive = r.percent > 0 && r.percent < 100;

            return (
              <div key={r.round} className="transition-colors hover:bg-slate-900/40">
                <div
                  onClick={() => setExpandedRound(isExpanded ? null : r.round)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      R{r.round}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Round {r.round}</span>
                        {isCompleted && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                            100% Done
                          </span>
                        )}
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            In Progress ({r.pending} pending)
                          </span>
                        )}
                        {!isCompleted && !isActive && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                            Scheduled
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span>
                          {r.completed} / {r.total} matches played
                        </span>
                        <span>•</span>
                        <span>{r.goals} goals recorded</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: progress bar + toggle icon */}
                  <div className="flex items-center gap-3 w-full sm:w-64">
                    <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-400' : isActive ? 'bg-amber-400' : 'bg-slate-700'
                        }`}
                        style={{ width: `${r.percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-300 w-10 text-right">
                      {r.percent}%
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details: List of all matches in this round */}
                {isExpanded && (() => {
                  const pendingMatches = r.matches.filter(
                    (m) => m.status !== 'completed' || m.homeScore === null || m.awayScore === null
                  );
                  const finishedMatches = r.matches.filter(
                    (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
                  );

                  const renderMatchItem = (m: Match, isDone: boolean) => {
                    const home = teamMap.get(m.homeTeamId);
                    const away = teamMap.get(m.awayTeamId);

                    return (
                      <div
                        key={m.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewMatchDetail?.(m);
                        }}
                        className={`p-3 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs group ${
                          isDone
                            ? 'bg-[#111420] border-slate-800/80 hover:border-slate-700 hover:bg-[#141828]'
                            : 'bg-[#14120e] border-amber-500/25 hover:border-amber-500/45 hover:bg-[#1a1610]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                          {/* Home */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <TeamLogo team={home} size="xs" />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-200 block truncate group-hover:text-white">
                                {home?.clubName || 'Home'}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                @{home?.managerName || 'TBD'}
                              </span>
                            </div>
                          </div>

                          {/* Center Score / VS */}
                          <div
                            className={`shrink-0 px-2.5 py-1 rounded-lg font-mono font-bold text-xs text-center min-w-[54px] shadow-inner border ${
                              isDone
                                ? 'bg-[#0c0f17] border-slate-800/90 text-emerald-400'
                                : 'bg-amber-950/40 border-amber-800/40 text-amber-300'
                            }`}
                          >
                            {isDone ? (
                              <span>
                                {m.homeScore} - {m.awayScore}
                              </span>
                            ) : (
                              <span className="font-sans text-[11px] font-bold text-amber-400">vs</span>
                            )}
                          </div>

                          {/* Away */}
                          <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                            <div className="min-w-0">
                              <span className="font-bold text-slate-200 block truncate group-hover:text-white">
                                {away?.clubName || 'Away'}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                @{away?.managerName || 'TBD'}
                              </span>
                            </div>
                            <TeamLogo team={away} size="xs" />
                          </div>
                        </div>

                        {/* Footer / Meta on mobile, inline status on desktop */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
                          <span className="text-[10px] text-slate-500 sm:hidden">
                            {isDone ? 'Finished' : 'Upcoming'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isDone
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {isDone ? 'Completed' : 'Pending'}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 sm:hidden" />
                          </div>
                        </div>
                      </div>
                    );
                  };

                  const isPendingOpen =
                    pendingOpenMap[r.round] !== undefined ? pendingOpenMap[r.round] : true;
                  const defaultFinishedOpen = pendingMatches.length === 0;
                  const isFinishedOpen =
                    finishedOpenMap[r.round] !== undefined
                      ? finishedOpenMap[r.round]
                      : defaultFinishedOpen;

                  return (
                    <div className="px-3 sm:px-4 pb-4 pt-2.5 bg-[#0a0d14] border-t border-slate-800/60 space-y-3">
                      {/* 1. Pending Matches Section (Collapsible, open by default) */}
                      {pendingMatches.length > 0 && (
                        <div className="rounded-xl border border-amber-500/25 bg-[#14110b]/70 overflow-hidden shadow-xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePending(r.round);
                            }}
                            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-amber-500/10 active:bg-amber-500/15 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              {isPendingOpen ? (
                                <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                                Pending Fixtures ({pendingMatches.length})
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {isPendingOpen ? 'Collapse' : 'Expand'}
                            </span>
                          </button>

                          {isPendingOpen && (
                            <div className="p-2.5 sm:p-3 pt-1 border-t border-amber-500/15">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {pendingMatches.map((m) => renderMatchItem(m, false))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Finished Matches Section (Collapsible, closed by default unless 100% completed) */}
                      {finishedMatches.length > 0 && (
                        <div className="rounded-xl border border-emerald-500/20 bg-[#0a120f]/60 overflow-hidden shadow-xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFinished(r.round, defaultFinishedOpen);
                            }}
                            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-emerald-500/10 active:bg-emerald-500/15 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              {isFinishedOpen ? (
                                <ChevronDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                                Finished Matches ({finishedMatches.length})
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {isFinishedOpen ? 'Collapse' : 'Expand'}
                            </span>
                          </button>

                          {isFinishedOpen && (
                            <div className="p-2.5 sm:p-3 pt-1 border-t border-emerald-500/15">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {finishedMatches.map((m) => renderMatchItem(m, true))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
