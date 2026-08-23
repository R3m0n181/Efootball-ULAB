import React, { useState, useMemo } from 'react';
import {
  Shield,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Team, TeamDefenseStat } from '../types';
import { TeamLogo } from './TeamLogo';

interface DefenseRankingViewProps {
  defenseStats: TeamDefenseStat[];
  onSelectTeam: (team: Team) => void;
}

type SortField =
  | 'rank'
  | 'club'
  | 'played'
  | 'goalsConceded'
  | 'goalsConcededPerMatch'
  | 'cleanSheets'
  | 'cleanSheetPct';

export const DefenseRankingView: React.FC<DefenseRankingViewProps> = ({
  defenseStats,
  onSelectTeam,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const topDefendingTeam = defenseStats.find((s) => s.matchesPlayed > 0) || null;

  const totalCleanSheets = useMemo(() => {
    return defenseStats.reduce((sum, s) => sum + s.cleanSheets, 0);
  }, [defenseStats]);

  const totalGoalsConceded = useMemo(() => {
    return defenseStats.reduce((sum, s) => sum + s.goalsConceded, 0);
  }, [defenseStats]);

  const totalMatchesPlayed = useMemo(() => {
    return defenseStats.reduce((sum, s) => sum + s.matchesPlayed, 0);
  }, [defenseStats]);

  const avgConcededPerMatch =
    totalMatchesPlayed > 0
      ? (totalGoalsConceded / (totalMatchesPlayed / 2)).toFixed(2)
      : '0.00';

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // For defensive stats:
      // rank, club, goalsConceded, goalsConcededPerMatch default to 'asc' (lower is better!)
      // cleanSheets, cleanSheetPct, played default to 'desc' (higher is better!)
      if (
        field === 'rank' ||
        field === 'club' ||
        field === 'goalsConceded' ||
        field === 'goalsConcededPerMatch'
      ) {
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
    const filtered = defenseStats.filter((row) => {
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
        case 'goalsConceded':
          compare = a.goalsConceded - b.goalsConceded;
          break;
        case 'goalsConcededPerMatch':
          compare = a.goalsConcededPerMatch - b.goalsConcededPerMatch;
          break;
        case 'cleanSheets':
          compare = a.cleanSheets - b.cleanSheets;
          break;
        case 'cleanSheetPct':
          compare = a.cleanSheetPct - b.cleanSheetPct;
          break;
        default:
          compare = 0;
      }

      if (compare !== 0) {
        return sortDirection === 'asc' ? compare : -compare;
      }
      return a.rank - b.rank;
    });
  }, [defenseStats, searchTerm, sortField, sortDirection]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-cyan-400 shrink-0 inline-block ml-0.5" />
      ) : (
        <ArrowDown className="w-3 h-3 text-cyan-400 shrink-0 inline-block ml-0.5" />
      );
    }
    return (
      <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover/th:opacity-100 transition shrink-0 inline-block ml-0.5" />
    );
  };

  return (
    <div id="defense-rankings-container" className="space-y-3.5">
      {/* Top Banner / Header Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Highlighted #1 Defending Team */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-xl border-2 border-cyan-500/50 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-[#0f1219] p-3.5 shadow-lg shadow-cyan-950/30">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400/20 to-emerald-500/20 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shrink-0">
                <Shield className="w-6 h-6 text-cyan-400 drop-shadow" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
                    Top Defending Team
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-black">
                    #1 DEFENCE RANK
                  </span>
                </div>

                {topDefendingTeam ? (
                  <div
                    onClick={() => onSelectTeam(topDefendingTeam.team)}
                    className="mt-1 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <TeamLogo team={topDefendingTeam.team} size="sm" />
                      <span className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 group-hover:underline transition">
                        {topDefendingTeam.team.clubName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-medium pl-9 -mt-0.5">
                      {topDefendingTeam.team.managerName}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mt-1">Awaiting completed match results</div>
                )}
              </div>
            </div>

            {topDefendingTeam && (
              <div className="flex items-center gap-3 bg-[#0a0c10]/90 border border-cyan-500/30 px-3.5 py-2 rounded-xl font-mono shrink-0 shadow-inner">
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Conceded / Match</div>
                  <div className="text-base sm:text-lg font-black text-cyan-400 leading-none">
                    {topDefendingTeam.goalsConcededPerMatch}
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Clean Sheets</div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-400 leading-none">
                    {topDefendingTeam.cleanSheets} CS
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Total GA</div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-300 leading-none">
                    {topDefendingTeam.goalsConceded} GA
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick League Defensive Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0f1219] p-3.5 flex flex-col justify-between space-y-2.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Defensive Statistics</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono font-semibold">
                ALL 21 CLUBS
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-[#0a0c10] border border-slate-800/80 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">Total Clean Sheets</div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  {totalCleanSheets} <span className="text-[10px] text-slate-500 font-normal">shutouts</span>
                </div>
              </div>
              <div className="bg-[#0a0c10] border border-slate-800/80 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">Avg GA / Match</div>
                <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                  {avgConcededPerMatch}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-slate-400 bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-2">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Ranking Metric:</strong> Primary sort is <strong>Lowest Goals Conceded / Match</strong>. Tiebreakers: Clean Sheets (CS), Fewest Total GA, Matches Played.
            </span>
          </div>
        </div>
      </div>

      {/* Control / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0f1219] p-2.5 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="defense-search-input"
            type="text"
            placeholder="Search club or manager name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0a0c10] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-400 font-medium">
          {!isDefaultSort && (
            <button
              onClick={resetToDefaultSort}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-cyan-400 rounded-md text-[11px] font-semibold transition cursor-pointer"
              title="Reset sorting to Default Defence Rank"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sort</span>
            </button>
          )}

          <div>
            Showing <span className="text-white font-bold">{filteredAndSorted.length}</span> of {defenseStats.length} Clubs
          </div>
        </div>
      </div>

      {/* Defence Ranking Table */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0c10] border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 select-none">
              <tr>
                {/* Rank */}
                <th
                  onClick={() => handleSort('rank')}
                  className="py-2.5 px-3 font-semibold cursor-pointer group/th hover:text-white transition w-14 text-center"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Rank</span>
                    {renderSortIndicator('rank')}
                  </div>
                </th>

                {/* Club & Manager */}
                <th
                  onClick={() => handleSort('club')}
                  className="py-2.5 px-3 font-semibold cursor-pointer group/th hover:text-white transition min-w-[180px] sm:min-w-[220px]"
                >
                  <div className="flex items-center gap-0.5">
                    <span>Club &amp; Manager</span>
                    {renderSortIndicator('club')}
                  </div>
                </th>

                {/* Matches Played */}
                <th
                  onClick={() => handleSort('played')}
                  className="py-2.5 px-2.5 font-semibold cursor-pointer group/th hover:text-white transition text-center w-16"
                  title="Matches Played"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>P</span>
                    {renderSortIndicator('played')}
                  </div>
                </th>

                {/* Goals Conceded Per Match */}
                <th
                  onClick={() => handleSort('goalsConcededPerMatch')}
                  className="py-2.5 px-3 font-semibold cursor-pointer group/th hover:text-white transition text-center bg-cyan-500/10 text-cyan-300"
                  title="Lowest Goals Conceded Per Match (Primary Metric - Lower is Better)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Conceded / Match</span>
                    {renderSortIndicator('goalsConcededPerMatch')}
                  </div>
                </th>

                {/* Total Goals Conceded */}
                <th
                  onClick={() => handleSort('goalsConceded')}
                  className="py-2.5 px-3 font-semibold cursor-pointer group/th hover:text-white transition text-center"
                  title="Total Goals Conceded (GA)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Total GA</span>
                    {renderSortIndicator('goalsConceded')}
                  </div>
                </th>

                {/* Clean Sheets */}
                <th
                  onClick={() => handleSort('cleanSheets')}
                  className="py-2.5 px-3 font-semibold cursor-pointer group/th hover:text-white transition text-center"
                  title="Total Matches with Zero Goals Conceded"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>Clean Sheets</span>
                    {renderSortIndicator('cleanSheets')}
                  </div>
                </th>

                {/* Clean Sheet Percentage */}
                <th
                  onClick={() => handleSort('cleanSheetPct')}
                  className="py-2.5 px-3 font-semibold cursor-pointer group/th hover:text-white transition text-center hidden sm:table-cell"
                  title="Percentage of Matches Ending in a Clean Sheet"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>CS Rate</span>
                    {renderSortIndicator('cleanSheetPct')}
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
                    className={`hover:bg-slate-800/50 cursor-pointer transition ${
                      isLeader
                        ? 'bg-cyan-950/20'
                        : isTop3
                        ? 'bg-slate-900/30'
                        : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      {item.rank === 1 && item.matchesPlayed > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs shadow-sm">
                          1
                        </span>
                      ) : item.rank === 2 && item.matchesPlayed > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 border border-slate-300/40 text-slate-200 font-bold text-xs">
                          2
                        </span>
                      ) : item.rank === 3 && item.matchesPlayed > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-800/20 border border-cyan-700/40 text-cyan-400 font-bold text-xs">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold">{item.rank}</span>
                      )}
                    </td>

                    {/* Club & Manager Stacked */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <TeamLogo team={item.team} size="sm" />
                        <div className="min-w-0">
                          <div className="font-bold text-white hover:text-cyan-400 transition truncate flex items-center gap-1.5">
                            <span>{item.team.clubName}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">
                              ({item.team.shortCode})
                            </span>
                          </div>
                          {/* Player name displayed cleanly below team name */}
                          <div className="text-[11px] text-slate-400 truncate">
                            {item.team.managerName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Matches Played */}
                    <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                      {item.matchesPlayed}
                    </td>

                    {/* Conceded Per Match (Highlighted) */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-sm bg-cyan-500/5 text-cyan-400">
                      {item.matchesPlayed > 0 ? item.goalsConcededPerMatch.toFixed(2) : '-'}
                    </td>

                    {/* Total Goals Conceded */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-200">
                      {item.goalsConceded}
                    </td>

                    {/* Clean Sheets */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                      {item.matchesPlayed > 0 ? item.cleanSheets : '-'}
                    </td>

                    {/* Clean Sheet Percentage */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300 hidden sm:table-cell">
                      {item.matchesPlayed > 0 ? (
                        <span className="px-1.5 py-0.5 bg-slate-800/80 rounded border border-slate-700/60 text-slate-300 text-[11px]">
                          {item.cleanSheetPct}%
                        </span>
                      ) : (
                        '-'
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
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs sm:text-sm">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>Defence Ranking &amp; Top Defending Team Calculation Rules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          {/* Primary Formula */}
          <div className="bg-[#0a0c10] border border-slate-800/80 rounded-lg p-3 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              1. Primary Ranking Metric (Lowest is Best)
            </div>
            <p className="text-slate-300 leading-relaxed">
              <strong>Goals Conceded Per Match (GA / P)</strong>: Clubs are primarily ranked by the fewest average goals allowed per match. Teams that have completed at least 1 match take precedence over unplayed teams.
            </p>
            <div className="mt-2 font-mono text-[11px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded px-2.5 py-1 inline-block">
              Average = Total Goals Conceded (GA) ÷ Matches Played (P)
            </div>
          </div>

          {/* Tiebreaker Sequence */}
          <div className="bg-[#0a0c10] border border-slate-800/80 rounded-lg p-3 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              2. Tiebreaker Hierarchy
            </div>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>1st:</strong> Most Clean Sheets (CS) — Greater shutouts.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>2nd:</strong> Fewest Total Goals Conceded (GA) — Lowest total goals allowed.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>3rd:</strong> Matches Played (P) — More tested matches.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>4th:</strong> Alphabetical by Club Name.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
