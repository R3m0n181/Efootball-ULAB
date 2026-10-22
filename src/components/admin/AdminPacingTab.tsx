import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Calendar,
  Layers,
  Search,
  X,
  Edit3,
  ExternalLink,
  Users,
  Ban,
  Filter,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { Match, Team, TournamentConfig } from '../../types';
import { TeamLogo } from '../TeamLogo';
import { AdminUser } from '../../utils/auth';

interface AdminPacingTabProps {
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

export const AdminPacingTab: React.FC<AdminPacingTabProps> = ({
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
  // View mode switcher: 'queue' (Earliest Pending First) or 'rounds' (Macro Round-by-Round)
  const [viewMode, setViewMode] = useState<'queue' | 'rounds'>('queue');

  // Queue view state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'earliest' | 'latest' | 'team-asc'>('earliest');

  // Unified dropdown open state: only one popover open at a time
  const [openDropdown, setOpenDropdown] = useState<'round' | 'team' | 'exclude' | 'sort' | null>(null);

  // Search terms inside filter popovers
  const [roundSearchTerm, setRoundSearchTerm] = useState('');
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [excludeSearchTerm, setExcludeSearchTerm] = useState('');

  // Exclusion filter state: omit matches where either team is in excludedClubIds
  const [excludedClubIds, setExcludedClubIds] = useState<string[]>([]);
  const filterControlsRef = useRef<HTMLDivElement>(null);

  // Close any open dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterControlsRef.current &&
        !filterControlsRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleExcludeClub = (clubId: string) => {
    setExcludedClubIds((prev) =>
      prev.includes(clubId) ? prev.filter((id) => id !== clubId) : [...prev, clubId]
    );
  };

  // Rounds view state
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
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

  // Exclusively pending matches up to active matchday (MD 1 to MD activeMatchday)
  // Note: Abandoned (Double Forfeit) matches are resolved and cleared from backlog
  const activePendingMatches = useMemo(() => {
    return matches.filter(
      (m) =>
        m.round <= activeMatchday &&
        m.status !== 'completed' &&
        m.status !== 'abandoned'
    );
  }, [matches, activeMatchday]);

  // Total matches scheduled up to active matchday
  const totalMatchesUpToActiveMD = useMemo(() => {
    return matches.filter((m) => m.round <= activeMatchday).length;
  }, [matches, activeMatchday]);

  // Completed matches up to active matchday
  const completedUpToActiveMD = totalMatchesUpToActiveMD - activePendingMatches.length;

  const activePacingPercent =
    totalMatchesUpToActiveMD > 0
      ? Math.round((completedUpToActiveMD / totalMatchesUpToActiveMD) * 100)
      : 100;

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

  // Pending match counts per team in MD 1–activeMatchday
  const pendingCountsByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    activePendingMatches.forEach((m) => {
      counts.set(m.homeTeamId, (counts.get(m.homeTeamId) || 0) + 1);
      counts.set(m.awayTeamId, (counts.get(m.awayTeamId) || 0) + 1);
    });
    return counts;
  }, [activePendingMatches]);

  // Pending match counts per round in MD 1–activeMatchday
  const pendingCountsByRound = useMemo(() => {
    const counts = new Map<number, number>();
    activePendingMatches.forEach((m) => {
      counts.set(m.round, (counts.get(m.round) || 0) + 1);
    });
    return counts;
  }, [activePendingMatches]);

  // Currently selected team object
  const selectedTeam = useMemo(() => {
    return selectedTeamFilter !== 'all' ? teamMap.get(selectedTeamFilter) : null;
  }, [selectedTeamFilter, teamMap]);

  // Filtered list of clubs for exclusion search modal/dropdown
  const filteredClubsForExclusion = useMemo(() => {
    const list = [...teams];
    list.sort((a, b) => a.clubName.localeCompare(b.clubName));
    if (!excludeSearchTerm.trim()) return list;
    const term = excludeSearchTerm.toLowerCase().trim();
    return list.filter(
      (t) =>
        t.clubName.toLowerCase().includes(term) ||
        t.managerName.toLowerCase().includes(term)
    );
  }, [teams, excludeSearchTerm]);

  // Filtered list of clubs for Team filter popover
  const filteredTeamsForSelection = useMemo(() => {
    const list = [...teams];
    list.sort((a, b) => a.clubName.localeCompare(b.clubName));
    if (!teamSearchTerm.trim()) return list;
    const term = teamSearchTerm.toLowerCase().trim();
    return list.filter(
      (t) =>
        t.clubName.toLowerCase().includes(term) ||
        t.managerName.toLowerCase().includes(term)
    );
  }, [teams, teamSearchTerm]);

  // Available rounds in active pending list
  const availablePendingRounds = useMemo(() => {
    const rounds: number[] = Array.from(new Set(activePendingMatches.map((m) => m.round)));
    rounds.sort((a: number, b: number) => a - b);
    return rounds;
  }, [activePendingMatches]);

  // Filtered list of rounds for Round popover
  const filteredRoundsForSelection = useMemo(() => {
    if (!roundSearchTerm.trim()) return availablePendingRounds;
    const term = roundSearchTerm.toLowerCase().trim();
    return availablePendingRounds.filter((r) =>
      `matchday ${r} md ${r} round ${r} ${r}`.toLowerCase().includes(term)
    );
  }, [availablePendingRounds, roundSearchTerm]);

  // Filtered and sorted queue list
  const displayedQueueMatches = useMemo(() => {
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

    // Team filter (include only this club)
    if (selectedTeamFilter !== 'all') {
      list = list.filter(
        (m) => m.homeTeamId === selectedTeamFilter || m.awayTeamId === selectedTeamFilter
      );
    }

    // Exclusion filter (omit matches featuring any of the selected clubs)
    if (excludedClubIds.length > 0) {
      const excludedSet = new Set(excludedClubIds);
      list = list.filter(
        (m) => !excludedSet.has(m.homeTeamId) && !excludedSet.has(m.awayTeamId)
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
    excludedClubIds,
    sortBy,
    teamMap,
  ]);

  // Group matches by round for the Macro Round-by-Round breakdown
  const roundStats = useMemo(() => {
    const totalRounds = config.totalRounds || (teams.length > 1 ? (teams.length - 1) * 2 : 38);
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
      if (
        (m.status === 'completed' && m.homeScore !== null && m.awayScore !== null) ||
        m.status === 'abandoned'
      ) {
        rStat.completed += 1;
        rStat.goals += (m.homeScore || 0) + (m.awayScore || 0);
      } else {
        rStat.pending += 1;
      }
    });

    const list = Array.from(roundsMap.values()).map((r) => {
      const sortedMatches = [...r.matches].sort((a, b) => {
        const aDone =
          (a.status === 'completed' && a.homeScore !== null && a.awayScore !== null) ||
          a.status === 'abandoned';
        const bDone =
          (b.status === 'completed' && b.homeScore !== null && b.awayScore !== null) ||
          b.status === 'abandoned';
        if (aDone !== bDone) {
          return aDone ? 1 : -1;
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
  }, [matches, teams.length, config.totalRounds]);

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

  return (
    <div className="space-y-4">
      {/* 4 Unified Pacing Snapshot Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
        {/* Card 1: Active MD Pending */}
        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-300">Pending (MD 1–{activeMatchday})</span>
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className={`text-xl sm:text-2xl font-black font-mono ${
                activePendingMatches.length > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {activePendingMatches.length}
            </span>
            <span className="text-[11px] text-slate-500">/ {totalMatchesUpToActiveMD}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {completedUpToActiveMD} played in active matchdays
          </div>
        </div>

        {/* Card 2: Active Pace */}
        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-300">Active MD Velocity</span>
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                activePendingMatches.length > 0 ? 'text-rose-400' : 'text-emerald-400'
              } shrink-0`}
            />
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              {activePacingPercent}%
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

        {/* Card 4: Most Backlogged Club */}
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
            {mostBackloggedClub
              ? `${mostBackloggedClub.count} pending up to MD ${activeMatchday}`
              : 'No backlogs recorded'}
          </div>
        </div>
      </div>

      {/* View Mode Switcher Pills */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-[#0a0c10] border border-slate-800 p-1 rounded-xl shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'queue'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Fixtures Queue</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-900/30 text-white">
              {activePendingMatches.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('rounds')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'rounds'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Round-by-Round Breakdown</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-900/30 text-white">
              {roundStats.length} MDs
            </span>
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-mono hidden md:inline px-2">
          {viewMode === 'queue' ? 'Earliest unplayed games first' : 'Macro matchday progression'}
        </span>
      </div>

      {/* VIEW 1: CHRONOLOGICAL PENDING FIXTURES QUEUE */}
      {viewMode === 'queue' && (
        <div className="space-y-3">
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

              {/* Controls: Round, Team, Exclude Clubs & Sort Dropdowns */}
              <div
                ref={filterControlsRef}
                className="relative flex items-center gap-2 w-full sm:w-auto flex-wrap z-30"
              >
                {/* Mobile Backdrop Overlay */}
                {openDropdown && (
                  <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-40 sm:hidden animate-in fade-in duration-100"
                    onClick={() => setOpenDropdown(null)}
                  />
                )}

                {/* 1. Round Filter (Centered on X-axis) */}
                <div className="sm:relative flex-1 sm:flex-initial">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((curr) => (curr === 'round' ? null : 'round'))}
                    className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      selectedRoundFilter !== 'all'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-[#141824] border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                    }`}
                    title="Filter fixtures by Matchday"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className={`w-3.5 h-3.5 shrink-0 ${selectedRoundFilter !== 'all' ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="truncate">
                        {selectedRoundFilter === 'all'
                          ? `All MDs (1–${activeMatchday})`
                          : `Matchday ${selectedRoundFilter}`}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${
                        openDropdown === 'round' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Round Popover (Centered on X and Y axis on mobile) */}
                  {openDropdown === 'round' && (
                    <div className="fixed sm:absolute left-1/2 top-1/2 sm:top-full -translate-x-1/2 -translate-y-1/2 sm:translate-y-0 sm:mt-1.5 w-[calc(100vw-2rem)] max-w-sm sm:w-80 max-h-[85vh] sm:max-h-none overflow-hidden flex flex-col bg-[#10141f] border border-slate-700 rounded-xl shadow-2xl p-3 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            Matchday Filter
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Pending games up to active MD {activeMatchday}
                          </p>
                        </div>
                        {selectedRoundFilter !== 'all' && (
                          <button
                            type="button"
                            onClick={() => setSelectedRoundFilter('all')}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline underline-offset-2"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {availablePendingRounds.length > 5 && (
                        <div className="relative">
                          <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search matchday..."
                            value={roundSearchTerm}
                            onChange={(e) => setRoundSearchTerm(e.target.value)}
                            className="w-full pl-7 pr-6 py-1 bg-[#161c2a] border border-slate-700/80 rounded-md text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          />
                          {roundSearchTerm && (
                            <button
                              type="button"
                              onClick={() => setRoundSearchTerm('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {/* All Matchdays Option */}
                        <div
                          onClick={() => {
                            setSelectedRoundFilter('all');
                            setOpenDropdown(null);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none ${
                            selectedRoundFilter === 'all'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                              : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                              ALL
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold block truncate leading-tight">
                                Matchdays 1–{activeMatchday}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                All chronological pending fixtures
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {activePendingMatches.length} pend
                            </span>
                            {selectedRoundFilter === 'all' && (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </div>
                        </div>

                        {/* Individual Matchdays */}
                        {filteredRoundsForSelection.map((r) => {
                          const isSelected = selectedRoundFilter === r.toString();
                          const pendingCount = pendingCountsByRound.get(r) || 0;
                          return (
                            <div
                              key={r}
                              onClick={() => {
                                setSelectedRoundFilter(r.toString());
                                setOpenDropdown(null);
                              }}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none ${
                                isSelected
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                                  : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-[10px] font-mono font-bold">
                                  {r}
                                </span>
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold block truncate leading-tight">
                                    Matchday {r}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    Round {r} backlog
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  {pendingCount} pend
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-[10px]">
                          {availablePendingRounds.length} active MDs
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(null)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer text-xs"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Team Filter (Centered on X-axis) */}
                <div className="sm:relative flex-1 sm:flex-initial">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((curr) => (curr === 'team' ? null : 'team'))}
                    className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      selectedTeamFilter !== 'all'
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25'
                        : 'bg-[#141824] border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                    }`}
                    title="Filter fixtures by specific club"
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                      <Users className={`w-3.5 h-3.5 shrink-0 ${selectedTeamFilter !== 'all' ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className="truncate">
                        {selectedTeamFilter === 'all'
                          ? `All Clubs (${teams.length})`
                          : selectedTeam?.clubName || 'Selected Club'}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${
                        openDropdown === 'team' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Team Popover (Centered on X and Y axis on mobile) */}
                  {openDropdown === 'team' && (
                    <div className="fixed sm:absolute left-1/2 top-1/2 sm:top-full -translate-x-1/2 -translate-y-1/2 sm:translate-y-0 sm:mt-1.5 w-[calc(100vw-2rem)] max-w-sm sm:w-80 max-h-[85vh] sm:max-h-none overflow-hidden flex flex-col bg-[#10141f] border border-slate-700 rounded-xl shadow-2xl p-3 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            Club Filter
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Filter fixtures for a specific club
                          </p>
                        </div>
                        {selectedTeamFilter !== 'all' && (
                          <button
                            type="button"
                            onClick={() => setSelectedTeamFilter('all')}
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline underline-offset-2"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search club or manager..."
                          value={teamSearchTerm}
                          onChange={(e) => setTeamSearchTerm(e.target.value)}
                          className="w-full pl-7 pr-6 py-1 bg-[#161c2a] border border-slate-700/80 rounded-md text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        {teamSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setTeamSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {/* All Clubs Option */}
                        <div
                          onClick={() => {
                            setSelectedTeamFilter('all');
                            setOpenDropdown(null);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none ${
                            selectedTeamFilter === 'all'
                              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-200'
                              : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                              ALL
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold block truncate leading-tight">
                                All Clubs ({teams.length})
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                Fixtures across all clubs
                              </span>
                            </div>
                          </div>
                          {selectedTeamFilter === 'all' && (
                            <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />
                          )}
                        </div>

                        {/* Individual Clubs */}
                        {filteredTeamsForSelection.map((team) => {
                          const isSelected = selectedTeamFilter === team.id;
                          const pendingCount = pendingCountsByTeam.get(team.id) || 0;
                          return (
                            <div
                              key={team.id}
                              onClick={() => {
                                setSelectedTeamFilter(team.id);
                                setOpenDropdown(null);
                              }}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none ${
                                isSelected
                                  ? 'bg-blue-500/15 border border-blue-500/30 text-blue-200'
                                  : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <TeamLogo team={team} size="xs" className="shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold block truncate leading-tight">
                                    {team.clubName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    @{team.managerName}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                    pendingCount > 0
                                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {pendingCount} pend
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-blue-400" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-[10px]">
                          {teams.length} clubs available
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(null)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer text-xs"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Exclude Clubs Filter (Centered on X-axis) */}
                <div className="sm:relative flex-1 sm:flex-initial">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((curr) => (curr === 'exclude' ? null : 'exclude'))}
                    className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      excludedClubIds.length > 0
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                        : 'bg-[#141824] border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                    }`}
                    title="Exclude specific clubs from pending fixtures"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Ban className={`w-3.5 h-3.5 shrink-0 ${excludedClubIds.length > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
                      <span className="truncate">
                        {excludedClubIds.length === 0
                          ? 'Except Clubs'
                          : `Except (${excludedClubIds.length})`}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${
                        openDropdown === 'exclude' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Exclusion Popover (Centered on X and Y axis on mobile) */}
                  {openDropdown === 'exclude' && (
                    <div className="fixed sm:absolute left-1/2 top-1/2 sm:top-full -translate-x-1/2 -translate-y-1/2 sm:translate-y-0 sm:mt-1.5 w-[calc(100vw-2rem)] max-w-sm sm:w-80 max-h-[85vh] sm:max-h-none overflow-hidden flex flex-col bg-[#10141f] border border-slate-700 rounded-xl shadow-2xl p-3 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5 text-rose-400" />
                            Exclude Clubs Filter
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Omit fixtures featuring any selected club
                          </p>
                        </div>
                        {excludedClubIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExcludedClubIds([])}
                            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline underline-offset-2"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {/* Search box inside popover */}
                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search club or manager..."
                          value={excludeSearchTerm}
                          onChange={(e) => setExcludeSearchTerm(e.target.value)}
                          className="w-full pl-7 pr-6 py-1 bg-[#161c2a] border border-slate-700/80 rounded-md text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                        />
                        {excludeSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setExcludeSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Club list with checkboxes */}
                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {filteredClubsForExclusion.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-500">
                            No clubs found matching &quot;{excludeSearchTerm}&quot;
                          </div>
                        ) : (
                          filteredClubsForExclusion.map((team) => {
                            const isExcluded = excludedClubIds.includes(team.id);
                            const pendingCount = pendingCountsByTeam.get(team.id) || 0;
                            return (
                              <div
                                key={team.id}
                                onClick={() => toggleExcludeClub(team.id)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none ${
                                  isExcluded
                                    ? 'bg-rose-500/15 border border-rose-500/30 text-rose-200'
                                    : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isExcluded}
                                    onChange={() => {}} // handled by parent onClick
                                    className="rounded border-slate-700 text-rose-500 focus:ring-0 cursor-pointer pointer-events-none"
                                  />
                                  <TeamLogo team={team} size="xs" className="shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold block truncate leading-tight">
                                      {team.clubName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      @{team.managerName}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ml-2 ${
                                    pendingCount > 0
                                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {pendingCount} pend
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer actions */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-[10px]">
                          {excludedClubIds.length} of {teams.length} excluded
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(null)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer text-xs"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Sort Order Filter (Centered on X-axis) */}
                <div className="sm:relative flex-1 sm:flex-initial">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((curr) => (curr === 'sort' ? null : 'sort'))}
                    className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      sortBy !== 'earliest'
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
                        : 'bg-[#141824] border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                    }`}
                    title="Sort pending fixtures"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <ArrowUpDown className={`w-3.5 h-3.5 shrink-0 ${sortBy !== 'earliest' ? 'text-purple-400' : 'text-slate-400'}`} />
                      <span className="truncate">
                        {sortBy === 'earliest'
                          ? 'Earliest First'
                          : sortBy === 'latest'
                          ? 'Latest MD First'
                          : 'Club Name (A-Z)'}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${
                        openDropdown === 'sort' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Sort Popover (Centered on X and Y axis on mobile) */}
                  {openDropdown === 'sort' && (
                    <div className="fixed sm:absolute left-1/2 top-1/2 sm:top-full -translate-x-1/2 -translate-y-1/2 sm:translate-y-0 sm:mt-1.5 w-[calc(100vw-2rem)] max-w-sm sm:w-72 max-h-[85vh] sm:max-h-none overflow-hidden flex flex-col bg-[#10141f] border border-slate-700 rounded-xl shadow-2xl p-3 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
                            Sort Priority
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Pending fixtures queue ordering
                          </p>
                        </div>
                        {sortBy !== 'earliest' && (
                          <button
                            type="button"
                            onClick={() => setSortBy('earliest')}
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline underline-offset-2"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        {[
                          {
                            id: 'earliest' as const,
                            label: 'Earliest Match First',
                            badge: 'Default',
                            sub: 'Chronological matchday & match order',
                          },
                          {
                            id: 'latest' as const,
                            label: 'Latest Round First',
                            badge: `MD ${activeMatchday}→1`,
                            sub: 'Reverse matchday progression',
                          },
                          {
                            id: 'team-asc' as const,
                            label: 'Club Name (A–Z)',
                            badge: 'A–Z',
                            sub: 'Alphabetical order by home team',
                          },
                        ].map((opt) => {
                          const isSelected = sortBy === opt.id;
                          return (
                            <div
                              key={opt.id}
                              onClick={() => {
                                setSortBy(opt.id);
                                setOpenDropdown(null);
                              }}
                              className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition select-none ${
                                isSelected
                                  ? 'bg-purple-500/15 border border-purple-500/30 text-purple-200'
                                  : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold leading-tight">
                                    {opt.label}
                                  </span>
                                  {opt.badge && (
                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                                      {opt.badge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {opt.sub}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(null)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer text-xs"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Chips Bar */}
            {(excludedClubIds.length > 0 || selectedRoundFilter !== 'all' || selectedTeamFilter !== 'all') && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                  <Filter className="w-3 h-3 text-emerald-400" />
                  Active filters:
                </span>

                {/* Round Chip */}
                {selectedRoundFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>Matchday {selectedRoundFilter}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedRoundFilter('all')}
                      className="text-emerald-400 hover:text-white cursor-pointer ml-0.5 p-0.5 rounded-full hover:bg-emerald-500/30"
                      title="Clear matchday filter"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )}

                {/* Team Chip */}
                {selectedTeamFilter !== 'all' && selectedTeam && (
                  <span className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-200 border border-blue-500/30">
                    <TeamLogo team={selectedTeam} size="xs" className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{selectedTeam.clubName}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTeamFilter('all')}
                      className="text-blue-400 hover:text-white cursor-pointer ml-0.5 p-0.5 rounded-full hover:bg-blue-500/30"
                      title={`Clear ${selectedTeam.clubName} filter`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )}

                {/* Excluded Clubs Chips */}
                {excludedClubIds.map((id) => {
                  const team = teamMap.get(id);
                  if (!team) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-200 border border-rose-500/30 hover:border-rose-400 transition"
                    >
                      <Ban className="w-2.5 h-2.5 text-rose-400" />
                      <TeamLogo team={team} size="xs" className="w-3 h-3" />
                      <span className="max-w-[120px] truncate">{team.clubName}</span>
                      <button
                        type="button"
                        onClick={() => toggleExcludeClub(id)}
                        className="text-rose-400 hover:text-white cursor-pointer ml-0.5 p-0.5 rounded-full hover:bg-rose-500/30"
                        title={`Remove ${team.clubName} from exclusion`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoundFilter('all');
                    setSelectedTeamFilter('all');
                    setExcludedClubIds([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-300 underline underline-offset-2 ml-1 cursor-pointer font-medium"
                >
                  Clear all
                </button>
              </div>
            )}

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
                  Pending Fixtures (MD 1–{activeMatchday})
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 font-bold">
                  {displayedQueueMatches.length} pending
                </span>
                {excludedClubIds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 font-bold">
                    {excludedClubIds.length} {excludedClubIds.length === 1 ? 'club' : 'clubs'} excluded
                  </span>
                )}
              </div>

              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Earliest Match First
              </span>
            </div>

            {/* Matches List */}
            {displayedQueueMatches.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                {activePendingMatches.length === 0 ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">No Pending Fixtures Found</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      All scheduled fixtures from Matchday 1 through Matchday {activeMatchday} are 100% completed!
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                      <Filter className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">No Fixtures Match Active Filters</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {excludedClubIds.length > 0
                        ? `All pending fixtures in this range were omitted by your filter criteria (${excludedClubIds.length} club${excludedClubIds.length > 1 ? 's' : ''} excluded).`
                        : 'No pending fixtures match your current search, round, or team filters.'}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {excludedClubIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExcludedClubIds([])}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Clear Club Exclusions
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedRoundFilter('all');
                          setSelectedTeamFilter('all');
                          setExcludedClubIds([]);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {displayedQueueMatches.map((m, idx) => {
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
        </div>
      )}

      {/* VIEW 2: MACRO ROUND-BY-ROUND PACING BREAKDOWN */}
      {viewMode === 'rounds' && (
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
                Active
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'completed'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setStatusFilter('unstarted')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === 'unstarted'
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200'
                }`}
              >
                Unstarted
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
                      (m) => m.status !== 'completed' && m.status !== 'abandoned'
                    );
                    const finishedMatches = r.matches.filter(
                      (m) =>
                        (m.status === 'completed' && m.homeScore !== null && m.awayScore !== null) ||
                        m.status === 'abandoned'
                    );

                    const renderMatchItem = (m: Match, isDone: boolean) => {
                      const home = teamMap.get(m.homeTeamId);
                      const away = teamMap.get(m.awayTeamId);
                      const isAbandoned = m.status === 'abandoned';

                      return (
                        <div
                          key={m.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewMatchDetail?.(m);
                          }}
                          className={`p-3 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs group ${
                            isAbandoned
                              ? 'bg-[#181116] border-rose-800/60 hover:border-rose-700 hover:bg-[#20141c]'
                              : isDone
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
                                isAbandoned
                                  ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                                  : isDone
                                  ? 'bg-[#0c0f17] border-slate-800/90 text-emerald-400'
                                  : 'bg-amber-950/40 border-amber-800/40 text-amber-300'
                              }`}
                            >
                              {isAbandoned ? (
                                <span>0 - 0</span>
                              ) : isDone ? (
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

                          {/* Action controls */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isAbandoned
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isDone
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {isAbandoned ? 'Abandoned' : isDone ? 'Completed' : 'Pending'}
                            </span>
                            {!isDone && onEditMatch && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditMatch(m);
                                }}
                                className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[10px] transition cursor-pointer"
                              >
                                Submit
                              </button>
                            )}
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
                        {/* 1. Pending Matches Section */}
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

                        {/* 2. Finished Matches Section */}
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
      )}

      {/* Footer Diagnostic Guide for Pacing & Pending */}
      <div
        id="guide-admin-pacing"
        className="bg-[#0f1219] border border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Schedule Pacing &amp; Pending Queue Guide
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Active matchday backlog queue, earliest unplayed matches, and macro round-by-round completion benchmarks.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-center px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60 text-[10px] font-mono">
            Pacing Sub-Tab
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-[#141824]/60 border border-slate-800/60 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Queue Priority</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Prioritizes unplayed matches from earlier rounds up to MD {activeMatchday} so backlogs are resolved in chronological order.
            </p>
          </div>

          <div className="bg-[#141824]/60 border border-slate-800/60 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>Round Velocity Benchmarks</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Toggle to "Round-by-Round Breakdown" to inspect completion percentages, overall velocity, and round progress bars.
            </p>
          </div>

          <div className="bg-[#141824]/60 border border-slate-800/60 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Direct Score Logging</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Click "Submit Score" on any fixture in the queue or expanded round list to record final scores, upload screenshot proof, and update standings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
