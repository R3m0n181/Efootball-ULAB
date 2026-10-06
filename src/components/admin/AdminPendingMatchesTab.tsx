import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  Search,
  X,
  Edit3,
  ExternalLink,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Match, Team, TournamentConfig } from '../../types';
import { TeamLogo } from '../TeamLogo';
import { AdminUser } from '../../utils/auth';

interface AdminPendingMatchesTabProps {
  matches: Match[];
  teams: Team[];
  config: TournamentConfig;
  activeMatchday: number;
  adminUser?: AdminUser | null;
  onEditMatch?: (match: Match) => void;
  onViewMatchDetail?: (match: Match) => void;
  onSelectTeam?: (team: Team) => void;
  onNavigateToFixtures?: (round: number) => void;
  onNavigateToManagerLog?: () => void;
}

export const AdminPendingMatchesTab: React.FC<AdminPendingMatchesTabProps> = ({
  matches,
  teams,
  config,
  activeMatchday,
  adminUser,
  onEditMatch,
  onViewMatchDetail,
  onSelectTeam,
  onNavigateToFixtures,
  onNavigateToManagerLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'earliest' | 'latest' | 'team-asc'>('earliest');

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  // Exclusively pending matches up to active matchday (MD 1 to MD activeMatchday)
  const activePendingMatches = useMemo(() => {
    return matches.filter(
      (m) =>
        m.round <= activeMatchday &&
        (m.status !== 'completed' || m.homeScore === null || m.awayScore === null)
    );
  }, [matches, activeMatchday]);

  // Total matches scheduled up to active matchday
  const totalMatchesUpToActiveMD = useMemo(() => {
    return matches.filter((m) => m.round <= activeMatchday).length;
  }, [matches, activeMatchday]);

  // Completed matches up to active matchday
  const completedUpToActiveMD = totalMatchesUpToActiveMD - activePendingMatches.length;

  // Earliest incomplete matchday in active range
  const earliestLaggingRound = useMemo(() => {
    if (activePendingMatches.length === 0) return null;
    return Math.min(...activePendingMatches.map((m) => m.round));
  }, [activePendingMatches]);

  // Team with highest pending fixtures in active range
  const mostBackloggedClub = useMemo(() => {
    const counts = new Map<string, number>();
    activePendingMatches.forEach((m) => {
      counts.set(m.homeTeamId, (counts.get(m.homeTeamId) || 0) + 1);
      counts.set(m.awayTeamId, (counts.get(m.awayTeamId) || 0) + 1);
    });
    let maxTeamId = '';
    let maxCount = 0;
    counts.forEach((cnt, tId) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        maxTeamId = tId;
      }
    });
    return maxTeamId ? { team: teamMap.get(maxTeamId), count: maxCount } : null;
  }, [activePendingMatches, teamMap]);

  // Available rounds in active pending list
  const availablePendingRounds = useMemo(() => {
    const rounds: number[] = Array.from(new Set(activePendingMatches.map((m) => m.round)));
    rounds.sort((a: number, b: number) => a - b);
    return rounds;
  }, [activePendingMatches]);

  // Filtered and sorted list
  const displayedMatches = useMemo(() => {
    let list = [...activePendingMatches];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((m) => {
        const home = teamMap.get(m.homeTeamId);
        const away = teamMap.get(m.awayTeamId);
        const homeName = home?.clubName.toLowerCase() || '';
        const homeManager = home?.managerName.toLowerCase() || '';
        const awayName = away?.clubName.toLowerCase() || '';
        const awayManager = away?.managerName.toLowerCase() || '';
        const roundStr = `round ${m.round} md ${m.round} matchday ${m.round}`;
        return (
          homeName.includes(term) ||
          homeManager.includes(term) ||
          awayName.includes(term) ||
          awayManager.includes(term) ||
          roundStr.includes(term)
        );
      });
    }

    // Round filter
    if (selectedRoundFilter !== 'all') {
      const rNum = parseInt(selectedRoundFilter, 10);
      list = list.filter((m) => m.round === rNum);
    }

    // Team filter
    if (selectedTeamFilter !== 'all') {
      list = list.filter(
        (m) => m.homeTeamId === selectedTeamFilter || m.awayTeamId === selectedTeamFilter
      );
    }

    // Sorting: earliest match first by default
    list.sort((a, b) => {
      if (sortBy === 'earliest') {
        if (a.round !== b.round) return a.round - b.round;
        return (a.matchNumber || 0) - (b.matchNumber || 0);
      }
      if (sortBy === 'latest') {
        if (a.round !== b.round) return b.round - a.round;
        return (b.matchNumber || 0) - (a.matchNumber || 0);
      }
      if (sortBy === 'team-asc') {
        const homeA = teamMap.get(a.homeTeamId)?.clubName || '';
        const homeB = teamMap.get(b.homeTeamId)?.clubName || '';
        return homeA.localeCompare(homeB);
      }
      return a.round - b.round;
    });

    return list;
  }, [
    activePendingMatches,
    searchTerm,
    selectedRoundFilter,
    selectedTeamFilter,
    sortBy,
    teamMap,
  ]);

  return (
    <div className="space-y-4">
      {/* 4 Active Backlog Metric Snapshot Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
        {/* Card 1: Active MD Pending */}
        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-300">Pending (MD 1–{activeMatchday})</span>
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className={`text-xl sm:text-2xl font-black font-mono ${activePendingMatches.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {activePendingMatches.length}
            </span>
            <span className="text-[11px] text-slate-500">/ {totalMatchesUpToActiveMD}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {completedUpToActiveMD} played in current matchdays
          </div>
        </div>

        {/* Card 2: Active Completion Rate */}
        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-300">Active MD Pace</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${activePendingMatches.length > 0 ? 'text-rose-400' : 'text-emerald-400'} shrink-0`} />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              {totalMatchesUpToActiveMD > 0
                ? Math.round((completedUpToActiveMD / totalMatchesUpToActiveMD) * 100)
                : 100}
              %
            </span>
          </div>
          <div className="text-[10px] mt-1 truncate">
            {activePendingMatches.length > 0 ? (
              <span className="text-rose-300 font-semibold">{activePendingMatches.length} matches behind pace</span>
            ) : (
              <span className="text-emerald-300 font-semibold">100% up to date through MD {activeMatchday}!</span>
            )}
          </div>
        </div>

        {/* Card 3: Earliest Incomplete Matchday */}
        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-300">Earliest Lagging MD</span>
            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              {earliestLaggingRound ? `MD ${earliestLaggingRound}` : 'None'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {earliestLaggingRound
              ? `${activePendingMatches.filter((m) => m.round === earliestLaggingRound).length} pending in Round ${earliestLaggingRound}`
              : 'All active matchdays finished'}
          </div>
        </div>

        {/* Card 4: Most Backlogged Club in Active MD */}
        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-300">Most Behind</span>
            <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            {mostBackloggedClub?.team && (
              <TeamLogo team={mostBackloggedClub.team} size="xs" className="shrink-0 scale-90" />
            )}
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {mostBackloggedClub?.team ? mostBackloggedClub.team.clubName : 'None'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono truncate">
            {mostBackloggedClub ? `${mostBackloggedClub.count} pending up to MD ${activeMatchday}` : 'No backlogs recorded'}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-md">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search club, manager, matchday..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 bg-[#141824] border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Controls: Round, Team & Sort Dropdowns */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Round Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-1 sm:flex-initial">
              <select
                id="pending-filter-round"
                value={selectedRoundFilter}
                onChange={(e) => setSelectedRoundFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#141824] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer font-mono"
              >
                <option value="all">Matchdays 1–{activeMatchday} ({availablePendingRounds.length})</option>
                {availablePendingRounds.map((r) => (
                  <option key={r} value={r}>
                    Matchday {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-1 sm:flex-initial">
              <select
                id="pending-filter-team"
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="w-full sm:w-auto bg-[#141824] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[140px] truncate"
              >
                <option value="all">All Clubs ({teams.length})</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.clubName}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-1 sm:flex-initial">
              <select
                id="pending-sort-order"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto bg-[#141824] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer font-semibold"
              >
                <option value="earliest">Earliest Match First (Default)</option>
                <option value="latest">Latest Round First</option>
                <option value="team-asc">Club Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Informative Subtitle Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>
              Tracking incomplete fixtures scheduled from <strong>Matchday 1 up to Active Matchday {activeMatchday}</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            Chronological priority
          </span>
        </div>
      </div>

      {/* Pending Matches Feed (Sorted with Earliest Match First) */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-800 bg-[#0a0c10] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
              Pending Fixtures Queue (MD 1–{activeMatchday})
            </h3>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              {displayedMatches.length} pending
            </span>
          </div>

          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Earliest Match First
          </span>
        </div>

        {/* Matches List */}
        {displayedMatches.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">No Pending Fixtures Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All scheduled fixtures from Matchday 1 through Matchday {activeMatchday} are 100% completed!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {displayedMatches.map((m, idx) => {
              const home = teamMap.get(m.homeTeamId);
              const away = teamMap.get(m.awayTeamId);

              return (
                <div
                  key={m.id}
                  className="p-3 sm:p-3.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#121622]/40 hover:bg-[#151b2c]"
                >
                  {/* Left: Round Pill & Teams Display */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Index & Round Badge */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-11 sm:w-12">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black text-center w-full border bg-rose-500/20 text-rose-300 border-rose-500/40"
                        title={`Matchday ${m.round}`}
                      >
                        MD {m.round}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Team Matchup Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
                        {/* Home Team */}
                        <div
                          onClick={() => home && onSelectTeam?.(home)}
                          className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-initial cursor-pointer group"
                        >
                          {home && <TeamLogo team={home} size="xs" className="shrink-0" />}
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 truncate block">
                              {home?.clubName || 'Home'}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              @{home?.managerName || 'TBD'}
                            </span>
                          </div>
                        </div>

                        {/* Center VS pill */}
                        <div className="shrink-0 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold text-amber-400">
                          vs
                        </div>

                        {/* Away Team */}
                        <div
                          onClick={() => away && onSelectTeam?.(away)}
                          className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-initial cursor-pointer group justify-end sm:justify-start text-right sm:text-left"
                        >
                          <div className="min-w-0 order-1 sm:order-2">
                            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 truncate block">
                              {away?.clubName || 'Away'}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              @{away?.managerName || 'TBD'}
                            </span>
                          </div>
                          {away && (
                            <TeamLogo team={away} size="xs" className="shrink-0 order-2 sm:order-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Controls (Score submission, View in fixtures, Details) */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    {/* View in Fixtures */}
                    {onNavigateToFixtures && (
                      <button
                        type="button"
                        onClick={() => onNavigateToFixtures(m.round)}
                        className="px-2 py-1 bg-[#141824] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                        title={`Open Matchday ${m.round} in Fixtures`}
                      >
                        <Calendar className="w-3 h-3 text-blue-400" />
                        <span className="hidden md:inline">MD{m.round}</span>
                      </button>
                    )}

                    {/* Inspect Match Detail */}
                    {onViewMatchDetail && (
                      <button
                        type="button"
                        onClick={() => onViewMatchDetail(m)}
                        className="p-1.5 bg-[#141824] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 rounded-lg text-xs transition cursor-pointer"
                        title="View match fixture details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Admin Submit / Log Score */}
                    {onEditMatch && (
                      <button
                        type="button"
                        onClick={() => onEditMatch(m)}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                        title="Submit match result and score"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Submit Score</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Diagnostic Guide for Pending Matches */}
      <div
        id="guide-admin-pending"
        className="bg-[#0f1219] border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Pending Fixtures Queue Guide
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Active matchday incomplete fixtures listed earliest-first for streamlined schedule enforcement.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-center px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60 text-[10px] font-mono">
            Pending Sub-Tab
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-[#141824]/60 border border-slate-800/60 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Earliest Match First</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Prioritizes matches from earlier rounds to help clear long-standing backlogs before advancing the matchday.
            </p>
          </div>

          <div className="bg-[#141824]/60 border border-slate-800/60 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Active Matchday Enforced</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Restricted to Matchday 1 through Matchday {activeMatchday} so commissioners focus on unplayed games of current rounds.
            </p>
          </div>

          <div className="bg-[#141824]/60 border border-slate-800/60 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Direct Score Logging</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Click "Submit Score" on any fixture to record the result, upload screenshot proof, and update league standings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
