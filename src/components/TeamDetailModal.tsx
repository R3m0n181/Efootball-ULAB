import React, { useMemo } from 'react';
import {
  X,
  Calendar,
  Edit3,
  Camera,
  Eye,
  Coffee,
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
                          {opponent && <TeamLogo team={opponent} size="xs" />}
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
