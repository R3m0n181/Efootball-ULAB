import React from 'react';
import {
  X,
  Calendar,
  Edit3,
  Camera,
  Eye,
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
  onEditMatch,
  onViewMatchDetail,
}) => {
  if (!isOpen || !team) return null;

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  // Matches for this team
  const teamMatches = matches
    .filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
    .sort((a, b) => a.round - b.round);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with Team Branding - Club Name First, Player Below */}
        <div
          className="p-4 relative border-b border-slate-800 flex items-start justify-between text-white"
          style={{
            background: `linear-gradient(135deg, ${team.color}35 0%, #0a0c10 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            <TeamLogo team={team} size="lg" className="border border-white/20 shadow-lg" />
            <div>
              {/* Club Name First */}
              <h3 className="text-lg sm:text-xl font-black">{team.clubName}</h3>
              {/* Player Name Below */}
              <p className="text-xs text-slate-300 font-medium">
                Player / Manager: <span className="text-white font-semibold">{team.managerName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
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
          {/* Full Match Fixture Schedule */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Home & Away Fixture Schedule ({teamMatches.length} Matches)</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                {teamMatches.filter((m) => m.status === 'completed').length} completed
              </span>
            </div>

            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {teamMatches.map((match) => {
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

                return (
                  <div
                    key={match.id}
                    onClick={() => {
                      if (onViewMatchDetail) {
                        onViewMatchDetail(match);
                      }
                    }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-lg bg-[#0a0c10] border border-slate-800 hover:border-emerald-500/50 text-xs transition cursor-pointer group gap-2 sm:gap-3"
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
                          {opponent && <TeamLogo team={opponent} size="xs" />}
                          <strong className="text-white text-xs group-hover:text-emerald-400 transition truncate">
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

                    {/* Line 2 on Mobile (with thin divider) / Inline on Desktop */}
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

                      {/* View Button: positioned at the end of the line */}
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
                    </div>
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
