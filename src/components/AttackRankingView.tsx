import React, { useState, useMemo } from 'react';
import {
  Flame,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trophy,
  Target,
  Zap,
  Info,
  RotateCcw,
} from 'lucide-react';
import { Team, TeamAttackStat } from '../types';
import { TeamLogo } from './TeamLogo';

interface AttackRankingViewProps {
  attackStats: TeamAttackStat[];
  onSelectTeam: (team: Team) => void;
}

type SortField =
  | 'rank'
  | 'club'
  | 'played'
  | 'goalsScored'
  | 'goalsPerMatch'
  | 'highestMatchScore'
  | 'goalDifference';

export const AttackRankingView: React.FC<AttackRankingViewProps> = ({
  attackStats,
  onSelectTeam,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const topAttackingTeam = attackStats.find((s) => s.matchesPlayed > 0) || null;

  const totalLeagueGoals = useMemo(() => {
    return attackStats.reduce((sum, s) => sum + s.goalsScored, 0);
  }, [attackStats]);

  const totalMatchesPlayed = useMemo(() => {
    return attackStats.reduce((sum, s) => sum + s.matchesPlayed, 0);
  }, [attackStats]);

  const leagueAvgGoalsPerMatch =
    totalMatchesPlayed > 0
      ? (totalLeagueGoals / (totalMatchesPlayed / 2)).toFixed(2)
      : '0.00';

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default directions:
      // rank / club default asc; numeric stats default desc
      if (field === 'rank' || field === 'club') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const isDefaultSort = sortField === 'rank' && sortDirection === 'asc';

  const resetToDefaultSort = () => {
    setSortField('rank');
    setSortDirection('asc');
  };

  const filteredAndSorted = useMemo(() => {
    const filtered = attackStats.filter((row) => {
      const matchSearch =
        row.team.clubName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.team.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.team.shortCode.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let compare = 0;
      switch (sortField) {
        case 'rank':
          compare = a.rank - b.rank;
          break;
        case 'club':
          compare = a.team.clubName.localeCompare(b.team.clubName);
          break;
        case 'played':
          compare = a.matchesPlayed - b.matchesPlayed;
          break;
        case 'goalsScored':
          compare = a.goalsScored - b.goalsScored;
          break;
        case 'goalsPerMatch':
          compare = a.goalsPerMatch - b.goalsPerMatch;
          break;
        case 'highestMatchScore':
          compare = a.highestMatchScore - b.highestMatchScore;
          break;
        case 'goalDifference':
          compare = (a.goalDifference || 0) - (b.goalDifference || 0);
          break;
        default:
          compare = 0;
      }

      if (compare !== 0) {
        return sortDirection === 'asc' ? compare : -compare;
      }
      return a.rank - b.rank;
    });
  }, [attackStats, searchTerm, sortField, sortDirection]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-amber-400 shrink-0 inline-block ml-1" />
      ) : (
        <ArrowDown className="w-3 h-3 text-amber-400 shrink-0 inline-block ml-1" />
      );
    }
    return (
      <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-40 group-hover/th:opacity-100 group-hover/th:text-slate-200 transition shrink-0 inline-block ml-1" />
    );
  };

  return (
    <div id="attack-rankings-container" className="space-y-3.5">
      {/* Top Banner / Header Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Highlighted #1 Attacking Team */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/60 via-slate-900 to-[#0f1219] p-3.5 shadow-lg shadow-amber-950/30">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                <Flame className="w-6 h-6 text-amber-400 drop-shadow" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                    Top Attacking Team
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black">
                    #1 ATTACK RANK
                  </span>
                </div>

                {topAttackingTeam ? (
                  <div
                    onClick={() => onSelectTeam(topAttackingTeam.team)}
                    className="mt-1 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <TeamLogo team={topAttackingTeam.team} size="md" />
                      <span className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 group-hover:underline transition">
                        {topAttackingTeam.team.clubName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-medium pl-12 -mt-0.5">
                      {topAttackingTeam.team.managerName}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mt-1">Awaiting completed match results</div>
                )}
              </div>
            </div>

            {topAttackingTeam && (
              <div className="flex items-center gap-3 bg-[#0a0c10]/90 border border-amber-500/30 px-3.5 py-2 rounded-xl font-mono shrink-0 shadow-inner">
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Goals / Match</div>
                  <div className="text-base sm:text-lg font-black text-amber-400 leading-none">
                    {topAttackingTeam.goalsPerMatch}
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Total Goals</div>
                  <div className="text-xs sm:text-sm font-bold text-slate-200 leading-none">
                    {topAttackingTeam.goalsScored} GF
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Matches</div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-300 leading-none">
                    {topAttackingTeam.matchesPlayed} P
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick League Overview Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0f1219] p-3.5 flex flex-col justify-center space-y-2.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Attacking Statistics</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-semibold">
                ALL 21 CLUBS
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-[#0a0c10] border border-slate-800/80 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">Total League Goals</div>
                <div className="text-sm font-bold text-white font-mono mt-0.5">
                  {totalLeagueGoals} <span className="text-[10px] text-slate-500 font-normal">goals</span>
                </div>
              </div>
              <div className="bg-[#0a0c10] border border-slate-800/80 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">Avg Goals / Match</div>
                <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                  {leagueAvgGoalsPerMatch}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0f1219] p-2.5 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="attack-search-input"
            type="text"
            placeholder="Search club or manager name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0a0c10] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-400 font-medium">
          {!isDefaultSort && (
            <button
              onClick={resetToDefaultSort}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-amber-400 rounded-md text-[11px] font-semibold transition cursor-pointer"
              title="Reset sorting to Default Attack Rank"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sort</span>
            </button>
          )}

          <div>
            Showing <span className="text-white font-bold">{filteredAndSorted.length}</span> of {attackStats.length} Clubs
          </div>
        </div>
      </div>

      {/* Attack Ranking Table */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[420px] sm:min-w-full">
            <thead className="bg-[#0a0c10] border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 select-none">
              <tr className="border-b border-slate-800 bg-[#0a0c10]/95 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none backdrop-blur-xs">
                {/* Rank # (Sticky Left) */}
                <th className="py-2.5 px-1 sm:px-3 text-center w-6 sm:w-10 sticky left-0 z-20 bg-[#0a0c10]">
                  <div className="flex items-center justify-center">
                    <span>#</span>
                  </div>
                </th>

                {/* Club & Manager (Sticky Left next to Rank - Narrower on Mobile) */}
                <th className="py-2.5 px-1.5 sm:px-3.5 min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none sticky left-6 sm:left-10 z-20 bg-[#0a0c10] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80">
                  <div className="flex items-center gap-1">
                    <span className="sm:hidden">Club</span>
                    <span className="hidden sm:inline">Club / Team</span>
                  </div>
                </th>

                {/* Matches Played */}
                <th
                  onClick={() => handleSort('played')}
                  className={`py-2.5 px-1 sm:px-2.5 font-semibold cursor-pointer group/th hover:text-white transition text-center w-12 sm:w-16 ${
                    sortField === 'played' ? 'text-amber-300' : ''
                  }`}
                  title="Matches Played"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>P</span>
                    {renderSortIndicator('played')}
                  </div>
                </th>

                {/* Goals Scored Per Match */}
                <th
                  onClick={() => handleSort('goalsPerMatch')}
                  className={`py-2.5 px-2 sm:px-3 font-semibold cursor-pointer group/th hover:text-white transition text-center ${
                    sortField === 'goalsPerMatch' ? 'bg-amber-500/10 text-amber-300' : ''
                  }`}
                  title="Goals Scored Per Match (Primary Metric)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="sm:hidden">GF/M</span>
                    <span className="hidden sm:inline">Goals / Match</span>
                    {renderSortIndicator('goalsPerMatch')}
                  </div>
                </th>

                {/* Total Goals Scored */}
                <th
                  onClick={() => handleSort('goalsScored')}
                  className={`py-2.5 px-1.5 sm:px-3 font-semibold cursor-pointer group/th hover:text-white transition text-center ${
                    sortField === 'goalsScored' ? 'text-amber-300' : ''
                  }`}
                  title="Total Goals Scored (GF)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="sm:hidden">GF</span>
                    <span className="hidden sm:inline">Total GF</span>
                    {renderSortIndicator('goalsScored')}
                  </div>
                </th>

                {/* Highest Single Match Score */}
                <th
                  onClick={() => handleSort('highestMatchScore')}
                  className={`py-2.5 px-3 font-semibold cursor-pointer group/th hover:text-white transition text-center hidden md:table-cell ${
                    sortField === 'highestMatchScore' ? 'text-amber-300' : ''
                  }`}
                  title="Highest Goals Scored in a Single Match"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Max in Match</span>
                    {renderSortIndicator('highestMatchScore')}
                  </div>
                </th>

                {/* Goal Difference */}
                <th
                  onClick={() => handleSort('goalDifference')}
                  className={`py-2.5 px-3 font-semibold cursor-pointer group/th hover:text-white transition text-center hidden sm:table-cell ${
                    sortField === 'goalDifference' ? 'text-amber-300' : ''
                  }`}
                  title="Goal Difference (GF - GA)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Goal Diff</span>
                    {renderSortIndicator('goalDifference')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredAndSorted.map((item) => {
                const isLeader = item.rank === 1 && item.matchesPlayed > 0;
                const isTop3 = item.rank <= 3 && item.matchesPlayed > 0;

                return (
                  <tr
                    key={item.team.id}
                    onClick={() => onSelectTeam(item.team)}
                    className={`group hover:bg-slate-800/50 cursor-pointer transition ${
                      isLeader
                        ? 'bg-amber-950/20'
                        : isTop3
                        ? 'bg-slate-900/30'
                        : ''
                    }`}
                  >
                    {/* Rank (Sticky Left) */}
                    <td className="py-2 px-1 sm:px-3 text-center font-mono font-bold sticky left-0 z-10 bg-[#0f1219] group-hover:bg-[#151a24] transition w-6 sm:w-10">
                      <div className="flex items-center justify-center">
                        {item.rank === 1 && item.matchesPlayed > 0 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-500 text-slate-950 font-black text-[10px] sm:text-xs shadow-sm shadow-amber-500/20">
                            1
                          </span>
                        ) : item.rank === 2 && item.matchesPlayed > 0 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-300 text-slate-950 font-bold text-[10px] sm:text-xs">
                            2
                          </span>
                        ) : item.rank === 3 && item.matchesPlayed > 0 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-700 text-white font-bold text-[10px] sm:text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold text-[10px] sm:text-xs">{item.rank}</span>
                        )}
                      </div>
                    </td>

                    {/* Club & Manager Stacked (Sticky Left next to Rank - Compact on Mobile) */}
                    <td className="py-2 px-1.5 sm:px-3.5 sticky left-6 sm:left-10 z-10 bg-[#0f1219] group-hover:bg-[#151a24] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80 transition min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none">
                      <div className="flex items-center gap-1.5 sm:gap-2.5">
                        <TeamLogo team={item.team} size="table" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white group-hover:text-amber-400 transition truncate text-[11px] sm:text-sm leading-tight flex items-center gap-1">
                            <span className="truncate">{item.team.clubName}</span>
                            <span className="text-[9px] text-slate-400 font-mono font-normal hidden sm:inline">
                              ({item.team.shortCode})
                            </span>
                          </div>
                          {/* Player name displayed cleanly below team name */}
                          <div className="text-[9px] sm:text-[11px] text-slate-400 truncate leading-tight">
                            {item.team.managerName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Matches Played */}
                    <td className="py-2 sm:py-2.5 px-1 sm:px-2.5 text-center font-mono text-slate-300 text-xs">
                      {item.matchesPlayed}
                    </td>

                    {/* Goals Per Match (Highlighted) */}
                    <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center font-mono font-bold text-xs sm:text-sm bg-amber-500/5 text-amber-400">
                      {item.matchesPlayed > 0 ? item.goalsPerMatch.toFixed(2) : '-'}
                    </td>

                    {/* Total Goals Scored */}
                    <td className="py-2 sm:py-2.5 px-1.5 sm:px-3 text-center font-mono font-bold text-white text-xs sm:text-sm">
                      {item.goalsScored}
                    </td>

                    {/* Highest Single Match Score */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300 hidden md:table-cell">
                      {item.matchesPlayed > 0 ? (
                        <span className="px-1.5 py-0.5 bg-slate-800/80 rounded border border-slate-700/60 text-slate-200">
                          {item.highestMatchScore}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Goal Difference */}
                    <td className="py-2.5 px-3 text-center font-mono hidden sm:table-cell">
                      {item.matchesPlayed > 0 ? (
                        <span
                          className={`font-semibold ${
                            (item.goalDifference || 0) > 0
                              ? 'text-emerald-400'
                              : (item.goalDifference || 0) < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {(item.goalDifference || 0) > 0
                            ? `+${item.goalDifference}`
                            : item.goalDifference}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculation & Tiebreaker Rules Card */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Attack Ranking &amp; Top Attacking Team Calculation Rules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          {/* Primary Formula */}
          <div className="bg-[#0a0c10] border border-slate-800/80 rounded-lg p-3 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              1. Primary Ranking Metric
            </div>
            <p className="text-slate-300 leading-relaxed">
              <strong>Goals Scored Per Match (GF / P)</strong>: Clubs are primarily ranked by their average offensive output per match. Teams that have completed at least 1 match take precedence over unplayed teams.
            </p>
            <div className="mt-2 font-mono text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded px-2.5 py-1 inline-block">
              Average = Total Goals Scored (GF) ÷ Matches Played (P)
            </div>
          </div>

          {/* Tiebreaker Sequence */}
          <div className="bg-[#0a0c10] border border-slate-800/80 rounded-lg p-3 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              2. Tiebreaker Hierarchy
            </div>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>1st:</strong> Total Goals Scored (GF) — Greater total goals.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>2nd:</strong> Goal Difference (GD = GF - GA) — Higher differential.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>3rd:</strong> Matches Played (P) — More tested matches.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>4th:</strong> Highest Single Match Score — Highest peak match goals.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>5th:</strong> Alphabetical by Club Name.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
