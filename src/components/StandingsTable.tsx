import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import { StandingsRow, Team } from '../types';
import { TeamLogo } from './TeamLogo';

interface StandingsTableProps {
  standings: StandingsRow[];
  onSelectTeam: (team: Team) => void;
  onOpenSubmitModal: () => void;
  isAdmin?: boolean;
}

export type SortField =
  | 'rank'
  | 'club'
  | 'played'
  | 'won'
  | 'drawn'
  | 'lost'
  | 'points'
  | 'goalsFor'
  | 'goalsAgainst'
  | 'goalDifference'
  | 'cleanSheets';

export const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  onSelectTeam,
  onOpenSubmitModal,
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default direction for new sort selection
      if (field === 'rank' || field === 'club') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const resetToDefaultSort = () => {
    setSortField('points');
    setSortDirection('desc');
  };

  const isDefaultSort = sortField === 'points' && sortDirection === 'desc';

  const filteredAndSortedStandings = useMemo(() => {
    const filtered = standings.filter((row) => {
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
          compare = a.played - b.played;
          break;
        case 'won':
          compare = a.won - b.won;
          break;
        case 'drawn':
          compare = a.drawn - b.drawn;
          break;
        case 'lost':
          compare = a.lost - b.lost;
          break;
        case 'points':
          compare = a.points - b.points;
          break;
        case 'goalsFor':
          compare = a.goalsFor - b.goalsFor;
          break;
        case 'goalsAgainst':
          compare = a.goalsAgainst - b.goalsAgainst;
          break;
        case 'goalDifference':
          compare = a.goalDifference - b.goalDifference;
          break;
        case 'cleanSheets':
          compare = a.cleanSheets - b.cleanSheets;
          break;
        default:
          compare = 0;
      }

      if (compare !== 0) {
        return sortDirection === 'asc' ? compare : -compare;
      }

      // Tiebreaker fallback: default official league rank order
      return a.rank - b.rank;
    });
  }, [standings, searchTerm, sortField, sortDirection]);

  // Helper component to render sort icon on table headers
  const renderSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0 inline-block ml-0.5" />
      ) : (
        <ArrowDown className="w-3 h-3 text-emerald-400 shrink-0 inline-block ml-0.5" />
      );
    }
    return (
      <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover/th:opacity-100 transition shrink-0 inline-block ml-0.5" />
    );
  };

  return (
    <div className="space-y-3">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0f1219] p-2.5 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="standings-search-input"
            type="text"
            placeholder="Search club (e.g. Bayern Munich, Arsenal) or manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0a0c10] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-400 font-medium">
          {!isDefaultSort && (
            <button
              onClick={resetToDefaultSort}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 rounded-md text-[11px] font-semibold transition cursor-pointer"
              title="Reset sorting to Points"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sort</span>
            </button>
          )}

          <div>
            Showing <span className="text-white font-bold">{filteredAndSortedStandings.length}</span> of {standings.length} Teams
          </div>
        </div>
      </div>

      {/* Standings Table Card */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0a0c10]/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                {/* Rank # */}
                <th
                  onClick={() => handleSort('rank')}
                  className="py-2.5 px-2 sm:px-3 text-center w-8 sm:w-10 cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Rank (#)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'rank' ? 'text-emerald-400 font-black' : ''}>#</span>
                    {renderSortIndicator('rank')}
                  </div>
                </th>

                {/* Club / Team */}
                <th
                  onClick={() => handleSort('club')}
                  className="py-2.5 px-2 sm:px-3.5 min-w-[140px] sm:min-w-[200px] cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Club Name"
                >
                  <div className="flex items-center gap-1">
                    <span className={sortField === 'club' ? 'text-emerald-400 font-black' : ''}>Club / Team</span>
                    {renderSortIndicator('club')}
                  </div>
                </th>

                {/* MP */}
                <th
                  onClick={() => handleSort('played')}
                  className="py-2.5 px-1.5 sm:px-2 text-center cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Matches Played (MP)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'played' ? 'text-emerald-400 font-black' : ''}>MP</span>
                    {renderSortIndicator('played')}
                  </div>
                </th>

                {/* Won */}
                <th
                  onClick={() => handleSort('won')}
                  className="py-2.5 px-1.5 sm:px-2 text-center text-emerald-400 cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Wins (W)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'won' ? 'font-black' : ''}>W</span>
                    {renderSortIndicator('won')}
                  </div>
                </th>

                {/* Drawn */}
                <th
                  onClick={() => handleSort('drawn')}
                  className="py-2.5 px-1.5 sm:px-2 text-center text-amber-400 cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Draws (D)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'drawn' ? 'font-black' : ''}>D</span>
                    {renderSortIndicator('drawn')}
                  </div>
                </th>

                {/* Lost */}
                <th
                  onClick={() => handleSort('lost')}
                  className="py-2.5 px-1.5 sm:px-2 text-center text-rose-400 cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Losses (L)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'lost' ? 'font-black' : ''}>L</span>
                    {renderSortIndicator('lost')}
                  </div>
                </th>

                {/* Points (PTS) */}
                <th
                  onClick={() => handleSort('points')}
                  className="py-2.5 px-2 sm:px-3 text-center text-emerald-400 font-black cursor-pointer group/th hover:bg-slate-800/60 transition bg-emerald-950/20"
                  title="Sort by Points (PTS) - Default"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'points' ? 'underline decoration-emerald-400/60 underline-offset-2' : ''}>PTS</span>
                    {renderSortIndicator('points')}
                  </div>
                </th>

                {/* GF */}
                <th
                  onClick={() => handleSort('goalsFor')}
                  className="py-2.5 px-1.5 sm:px-2 text-center cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Goals For (GF)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'goalsFor' ? 'text-emerald-400 font-black' : ''}>GF</span>
                    {renderSortIndicator('goalsFor')}
                  </div>
                </th>

                {/* GA */}
                <th
                  onClick={() => handleSort('goalsAgainst')}
                  className="py-2.5 px-1.5 sm:px-2 text-center cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Goals Against (GA)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'goalsAgainst' ? 'text-emerald-400 font-black' : ''}>GA</span>
                    {renderSortIndicator('goalsAgainst')}
                  </div>
                </th>

                {/* GD */}
                <th
                  onClick={() => handleSort('goalDifference')}
                  className="py-2.5 px-1.5 sm:px-2 text-center cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Goal Difference (GD)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'goalDifference' ? 'text-emerald-400 font-black' : ''}>GD</span>
                    {renderSortIndicator('goalDifference')}
                  </div>
                </th>

                {/* CS */}
                <th
                  onClick={() => handleSort('cleanSheets')}
                  className="py-2.5 px-1.5 sm:px-2 text-center text-cyan-400/90 cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Clean Sheets (CS)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'cleanSheets' ? 'text-cyan-300 font-black' : ''}>CS</span>
                    {renderSortIndicator('cleanSheets')}
                  </div>
                </th>

                {/* Form */}
                <th className="py-2.5 px-3 min-w-[120px] hidden md:table-cell text-center">Form</th>

                {/* Details */}
                <th className="py-2.5 px-1.5 sm:px-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredAndSortedStandings.map((row) => {
                return (
                  <tr
                    key={row.team.id}
                    onClick={() => onSelectTeam(row.team)}
                    className={`group transition hover:bg-slate-800/50 cursor-pointer ${
                      row.rank === 1 ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-2 px-2 text-center font-mono font-bold">
                      <div className="flex items-center justify-center">
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                            row.rank === 1
                              ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                              : row.rank === 2
                              ? 'bg-slate-300 text-slate-950 font-bold'
                              : row.rank === 3
                              ? 'bg-amber-700 text-white font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {row.rank}
                        </span>
                      </div>
                    </td>

                    {/* Club (Top) & Manager (Below) */}
                    <td className="py-2 px-3.5">
                      <div className="flex items-center gap-2.5">
                        {/* Official Club Crest */}
                        <TeamLogo team={row.team} size="sm" />

                        <div className="min-w-0">
                          {/* Team name first (Prominent) */}
                          <div className="font-bold text-white group-hover:text-emerald-400 transition truncate text-xs sm:text-sm">
                            {row.team.clubName}
                          </div>
                          {/* Player name below */}
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span className="font-medium text-slate-400">{row.team.managerName}</span>
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-[10px] text-slate-500 uppercase">
                              {row.team.shortCode}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* MP */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono font-medium text-slate-300">
                      {row.played}
                    </td>

                    {/* Won */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono font-semibold text-emerald-400">
                      {row.won}
                    </td>

                    {/* Drawn */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-amber-400">
                      {row.drawn}
                    </td>

                    {/* Lost */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-rose-400">
                      {row.lost}
                    </td>

                    {/* Points */}
                    <td className="py-2 px-2 sm:px-3 text-center font-mono font-black text-xs sm:text-sm text-emerald-400 bg-emerald-950/20">
                      {row.points}
                    </td>

                    {/* GF */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-slate-300">
                      {row.goalsFor}
                    </td>

                    {/* GA */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-slate-400">
                      {row.goalsAgainst}
                    </td>

                    {/* GD */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono font-bold">
                      <span
                        className={
                          row.goalDifference > 0
                            ? 'text-emerald-400'
                            : row.goalDifference < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }
                      >
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </span>
                    </td>

                    {/* Clean Sheets */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-slate-300">
                      {row.cleanSheets}
                    </td>

                    {/* Form Pills */}
                    <td className="py-2 px-3 hidden md:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {row.form.length === 0 ? (
                          <span className="text-[10px] text-slate-600 italic">No matches</span>
                        ) : (
                          row.recentMatches.map((match, idx) => (
                            <span
                              key={idx}
                              title={`${match.isHome ? 'vs' : '@'} ${match.opponentShortCode} (${match.score})`}
                              className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold font-mono ${
                                match.result === 'W'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : match.result === 'D'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {match.result}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Details Arrow */}
                    <td className="py-2 px-2 text-right">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition inline-block" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Legend */}
        <div className="bg-[#0a0c10]/90 px-3.5 py-2.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-amber-500" />
              <span className="text-slate-300 font-medium">1st Place: League Champions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Double Round-Robin (Home & Away) • Click any column header to sort</span>
            </div>
          </div>

          {isAdmin ? (
            <button
              onClick={onOpenSubmitModal}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <span>Submit match result</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Click on any team row to view detailed team stats &amp; fixtures</span>
              <ChevronRight className="w-3 h-3 text-emerald-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
