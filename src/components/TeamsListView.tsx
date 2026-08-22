import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ArrowDownAZ,
  ArrowUpAZ,
  Trophy,
  User,
} from 'lucide-react';
import { Team, StandingsRow } from '../types';
import { TeamLogo } from './TeamLogo';

interface TeamsListViewProps {
  teams: Team[];
  standings: StandingsRow[];
  onSelectTeam: (team: Team) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'rank-asc' | 'manager-asc';

export const TeamsListView: React.FC<TeamsListViewProps> = ({
  teams,
  standings,
  onSelectTeam,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

  const rankMap = useMemo(() => {
    const map = new Map<string, StandingsRow>();
    standings.forEach((s) => map.set(s.team.id, s));
    return map;
  }, [standings]);

  const sortedAndFilteredTeams = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const filtered = teams.filter(
      (t) =>
        t.clubName.toLowerCase().includes(term) ||
        t.managerName.toLowerCase().includes(term) ||
        t.shortCode.toLowerCase().includes(term)
    );

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.clubName.localeCompare(b.clubName, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'name-desc') {
        return b.clubName.localeCompare(a.clubName, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'manager-asc') {
        return a.managerName.localeCompare(b.managerName, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'rank-asc') {
        const rankA = rankMap.get(a.id)?.rank ?? 999;
        const rankB = rankMap.get(b.id)?.rank ?? 999;
        return rankA - rankB;
      }
      return a.clubName.localeCompare(b.clubName);
    });
  }, [teams, searchTerm, sortBy, rankMap]);

  return (
    <div className="space-y-3">
      {/* Search and Sort Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0f1219] p-2.5 rounded-xl border border-slate-800">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="teams-search-input"
              type="text"
              placeholder="Search club (e.g. Bayern Munich, Leverkusen) or player..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0a0c10] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">Sort:</span>
            <select
              id="teams-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 text-xs bg-[#0a0c10] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="name-asc">Team Name (A → Z)</option>
              <option value="name-desc">Team Name (Z → A)</option>
              <option value="rank-asc">League Rank (#1 → Last)</option>
              <option value="manager-asc">Player Name (A → Z)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-white font-bold">{sortedAndFilteredTeams.length}</span> of {teams.length} Participating Teams
        </div>
      </div>

      {/* Grid of Team Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedAndFilteredTeams.map((team) => {
          const stats = rankMap.get(team.id);

          return (
            <div
              key={team.id}
              className="bg-[#0f1219] border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition shadow-sm flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Left Accent Bar */}
              <div
                className="absolute top-0 left-0 bottom-0 w-1"
                style={{ backgroundColor: team.color }}
              />

              <div>
                {/* Header: Club Name Top, Player Below */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 pl-1">
                    <TeamLogo team={team} size="md" />
                    <div>
                      {/* Team Name First */}
                      <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-400 transition">
                        {team.clubName}
                      </h4>
                      {/* Player Name Below */}
                      <p className="text-[11px] text-slate-400 font-medium">
                        Player: <span className="text-slate-300 font-semibold">{team.managerName}</span>
                      </p>
                    </div>
                  </div>

                  {stats && (
                    <div className="text-right">
                      <span className="text-[11px] font-mono font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                        #{stats.rank}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{stats.points} PTS</div>
                    </div>
                  )}
                </div>

                {/* Season Performance Snapshot */}
                <div className="bg-[#0a0c10] rounded-lg p-2.5 border border-slate-800/80 mb-2.5 grid grid-cols-4 gap-1 text-center font-mono">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase">Played</div>
                    <div className="text-xs font-bold text-white">{stats?.played ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase">Won</div>
                    <div className="text-xs font-bold text-emerald-400">{stats?.won ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase">Drawn</div>
                    <div className="text-xs font-bold text-amber-400">{stats?.drawn ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase">Lost</div>
                    <div className="text-xs font-bold text-rose-400">{stats?.lost ?? 0}</div>
                  </div>
                </div>

                {/* Recent Form Pills */}
                {stats && stats.form.length > 0 && (
                  <div className="bg-[#0a0c10]/60 rounded-lg px-2.5 py-1.5 border border-slate-800/60 mb-2.5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Recent Form</span>
                    <div className="flex items-center gap-1">
                      {stats.recentMatches.map((match, idx) => (
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
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                <button
                  onClick={() => onSelectTeam(team)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-md transition cursor-pointer"
                >
                  <span>Team Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
