import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Share2,
  Edit3,
  Coffee,
  ChevronLeft,
  ChevronRight,
  FileText,
  Camera,
  Eye,
} from 'lucide-react';
import { Match, Team, TournamentConfig } from '../types';
import { TeamLogo } from './TeamLogo';

interface FixturesViewProps {
  matches: Match[];
  teams: Team[];
  config: TournamentConfig;
  byesPerRound: Record<number, string>;
  onEditMatch: (match: Match) => void;
  onShareMatch: (match: Match) => void;
  onSelectTeam: (team: Team) => void;
  onViewMatchDetail: (match: Match) => void;
  isAdmin?: boolean;
}

export const FixturesView: React.FC<FixturesViewProps> = ({
  matches,
  teams,
  config,
  byesPerRound,
  onEditMatch,
  onShareMatch,
  onSelectTeam,
  onViewMatchDetail,
  isAdmin = false,
}) => {
  // Total rounds (42 for 21 teams in Home & Away double round-robin)
  const totalRounds = config.totalRounds || 42;
  const roundsArray = Array.from({ length: totalRounds }, (_, i) => i + 1);

  // Compute earliest incomplete matchday (the first round with pending/unplayed matches)
  const earliestIncompleteRound = useMemo(() => {
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatchList = matches.filter((m) => m.round === r);
      const isCompleted =
        roundMatchList.length > 0 &&
        roundMatchList.every((m) => m.status === 'completed');
      if (!isCompleted) {
        return r;
      }
    }
    return 1;
  }, [matches, totalRounds]);

  const [selectedRound, setSelectedRound] = useState<number>(() => earliestIncompleteRound);

  // Default to 'scheduled' for incomplete matchdays, and 'all' for completed matchdays
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'scheduled'>(() => {
    const initialRoundMatches = matches.filter((m) => m.round === earliestIncompleteRound);
    const isCompleted =
      initialRoundMatches.length > 0 &&
      initialRoundMatches.every((m) => m.status === 'completed');
    return isCompleted ? 'all' : 'scheduled';
  });

  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  // Handler for selecting a matchday round
  const handleSelectRound = (roundNum: number) => {
    setSelectedRound(roundNum);
    setSelectedTeamId('all');
    const roundMatchList = matches.filter((m) => m.round === roundNum);
    const isCompleted =
      roundMatchList.length > 0 &&
      roundMatchList.every((m) => m.status === 'completed');
    setStatusFilter(isCompleted ? 'all' : 'scheduled');
  };

  // Auto-scroll active MD tab into center of view
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeEl = tabsContainerRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [selectedRound]);

  const scrollTabs = (offset: number) => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Matches within the current scope (by round or team)
  const scopedMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedTeamId !== 'all') {
        return m.homeTeamId === selectedTeamId || m.awayTeamId === selectedTeamId;
      }
      return m.round === selectedRound;
    });
  }, [matches, selectedRound, selectedTeamId]);

  const totalCount = scopedMatches.length;
  const completedCount = scopedMatches.filter((m) => m.status === 'completed').length;
  const scheduledCount = scopedMatches.filter((m) => m.status !== 'completed').length;

  // Filtered matches based on status filter
  const roundMatches = useMemo(() => {
    if (statusFilter === 'completed') {
      return scopedMatches.filter((m) => m.status === 'completed');
    }
    if (statusFilter === 'scheduled') {
      return scopedMatches.filter((m) => m.status !== 'completed');
    }
    return scopedMatches;
  }, [scopedMatches, statusFilter]);

  const byeTeamId = byesPerRound[selectedRound];
  const byeTeam = byeTeamId ? teamMap.get(byeTeamId) : null;

  return (
    <div id="tournament-fixtures-container" className="space-y-3">
      {/* Round Selection Bar */}
      <div className="bg-[#0f1219] border border-slate-800 p-2.5 rounded-xl shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Matchday Fixtures ({selectedRound <= 21 ? 'First Leg' : 'Return Leg - Home & Away'})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedRound !== earliestIncompleteRound && (
              <button
                id="btn-jump-current-round"
                onClick={() => handleSelectRound(earliestIncompleteRound)}
                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1"
                title={`Jump to earliest incomplete matchday (MD${earliestIncompleteRound})`}
              >
                <span>Current: MD{earliestIncompleteRound}</span>
              </button>
            )}

            <button
              id="btn-prev-round"
              onClick={() => handleSelectRound(Math.max(1, selectedRound - 1))}
              disabled={selectedRound <= 1}
              className="p-1 rounded bg-[#0a0c10] hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-bold text-emerald-400 px-2">
              Matchday {selectedRound} of {totalRounds}
            </span>
            <button
              id="btn-next-round"
              onClick={() => handleSelectRound(Math.min(totalRounds, selectedRound + 1))}
              disabled={selectedRound >= totalRounds}
              className="p-1 rounded bg-[#0a0c10] hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Round Pills Scroll with Mobile Visual Fade Cues */}
        <div className="relative flex items-center gap-1.5 pt-1">
          {/* Left Fade gradient indicator on mobile */}
          <div className="pointer-events-none absolute left-0 top-1 bottom-1 w-5 bg-gradient-to-r from-[#0f1219] to-transparent z-10 sm:hidden" />
          
          <button
            type="button"
            onClick={() => scrollTabs(-240)}
            aria-label="Scroll matchdays left"
            className="hidden sm:flex shrink-0 p-1 rounded-md bg-[#0a0c10] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div
            ref={tabsContainerRef}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth py-1 px-1 touch-pan-x select-none no-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {roundsArray.map((roundNum) => {
              const roundMatchList = matches.filter((m) => m.round === roundNum);
              const isCompleted =
                roundMatchList.length > 0 &&
                roundMatchList.every((m) => m.status === 'completed');
              const hasStarted = roundMatchList.some((m) => m.status === 'completed');
              const isActive = selectedRound === roundNum && selectedTeamId === 'all';

              return (
                <button
                  key={roundNum}
                  id={`tab-round-${roundNum}`}
                  data-active={isActive ? 'true' : undefined}
                  onClick={() => handleSelectRound(roundNum)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 scale-[1.03]'
                      : isCompleted
                      ? 'bg-[#0a0c10] text-emerald-400 border border-emerald-500/40 hover:bg-slate-800/80 hover:border-emerald-400'
                      : hasStarted
                      ? 'bg-[#0a0c10] text-amber-300 border border-amber-500/40 hover:bg-slate-800/80'
                      : 'bg-[#0a0c10] text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>MD{roundNum}</span>
                  {isCompleted ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ) : hasStarted ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Right Fade gradient indicator on mobile */}
          <div className="pointer-events-none absolute right-0 top-1 bottom-1 w-5 bg-gradient-to-l from-[#0f1219] to-transparent z-10 sm:hidden" />

          <button
            type="button"
            onClick={() => scrollTabs(240)}
            aria-label="Scroll matchdays right"
            className="hidden sm:flex shrink-0 p-1 rounded-md bg-[#0a0c10] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter & Bye Banner */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-[#0f1219] p-2.5 rounded-xl border border-slate-800">
        {/* Status / Team filters */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="flex items-center bg-[#0a0c10] border border-slate-800 rounded-lg p-0.5">
            <button
              id="filter-all"
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold transition ${
                  statusFilter === 'all'
                    ? 'bg-slate-700 text-slate-100'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {totalCount}
              </span>
            </button>
            <button
              id="filter-finished"
              onClick={() => setStatusFilter('completed')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <span>Finished</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold transition ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {completedCount}
              </span>
            </button>
            <button
              id="filter-scheduled"
              onClick={() => setStatusFilter('scheduled')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                statusFilter === 'scheduled'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <span>Scheduled</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold transition ${
                  statusFilter === 'scheduled'
                    ? 'bg-amber-900/90 text-amber-200 border border-amber-700/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {scheduledCount}
              </span>
            </button>
          </div>

          {/* Team filter dropdown */}
          <div className="relative">
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-[#0a0c10] border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Filter by Team / Manager (All)</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.clubName} ({t.managerName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BYE Slot Notification */}
        {selectedTeamId === 'all' && byeTeam && (
          <div className="flex items-center gap-2 bg-indigo-950/40 border border-indigo-800/40 px-3 py-1.5 rounded-lg text-xs">
            <Coffee className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <TeamLogo team={byeTeam} size="md" />
            <span className="text-slate-300">
              Bye / Rest this matchday:{' '}
              <strong className="text-white">
                {byeTeam.clubName}
              </strong>{' '}
              <span className="text-slate-400">({byeTeam.managerName})</span>
            </span>
          </div>
        )}
      </div>

      {/* Fixture Match Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {roundMatches.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-[#0f1219] border border-dashed border-slate-800 rounded-xl">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">No matches found for this filter</p>
            <p className="text-xs text-slate-600 mt-1">Try switching matchday or filter criteria</p>
          </div>
        ) : (
          roundMatches.map((match) => {
            const homeTeam = teamMap.get(match.homeTeamId);
            const awayTeam = teamMap.get(match.awayTeamId);

            if (!homeTeam || !awayTeam) return null;

            const isCompleted =
              match.status === 'completed' &&
              match.homeScore !== null &&
              match.awayScore !== null;

            const homeWon = isCompleted && match.homeScore! > match.awayScore!;
            const awayWon = isCompleted && match.awayScore! > match.homeScore!;

            return (
              <div
                key={match.id}
                onClick={isCompleted ? () => onViewMatchDetail(match) : undefined}
                className={`rounded-xl p-3.5 transition duration-200 flex flex-col justify-between relative overflow-hidden group ${
                  isCompleted
                    ? 'bg-gradient-to-b from-[#0c1f1c] via-[#0e1722] to-[#0a1318] border-2 border-emerald-500/70 shadow-lg shadow-emerald-950/50 hover:border-emerald-400 hover:shadow-emerald-900/50 ring-1 ring-emerald-500/30 cursor-pointer'
                    : 'bg-[#0f1219] border border-slate-800 hover:border-slate-700/80 shadow-md'
                }`}
              >
                {/* Ambient glow for completed matches */}
                {isCompleted && (
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                )}

                {/* Accent top gradient bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${homeTeam.color}, ${awayTeam.color})`,
                  }}
                />

                {/* Match Header */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2.5">
                  <span className={`font-mono font-medium ${isCompleted ? 'text-emerald-300/90' : 'text-slate-400'}`}>
                    MD {match.round} • Match #{match.matchNumber}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {match.screenshotUrl && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-1.5 py-0.2 rounded-full font-mono">
                        <Camera className="w-2.5 h-2.5" />
                        SS
                      </span>
                    )}

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-500/60 px-2 py-0.5 rounded-full font-mono shadow-xs shadow-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-400 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-full font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Scheduled
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareMatch(match);
                      }}
                      title="Share Match Card"
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Teams & Scoreboard - Team Name First, Manager Below */}
                <div className="grid grid-cols-5 items-center gap-2 py-1.5">
                  {/* Home Team (Team Name Top, Manager Below) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTeam(homeTeam);
                    }}
                    className="col-span-2 flex flex-col items-center text-center cursor-pointer group/home"
                  >
                    <TeamLogo team={homeTeam} size="md" className="mb-1 transition group-hover/home:scale-105" />
                    {/* Club Name First */}
                    <span className="text-xs font-bold text-white group-hover/home:text-emerald-400 transition truncate max-w-full">
                      {homeTeam.clubName}
                    </span>
                    {/* Manager Name Below */}
                    <span className="text-[10px] text-slate-400 truncate max-w-full">
                      {homeTeam.managerName}
                    </span>
                  </div>

                  {/* Score or VS */}
                  <div className="col-span-1 flex flex-col items-center justify-center">
                    {isCompleted ? (
                      <div className="flex items-center gap-1 bg-[#061014] px-2.5 py-1 rounded-lg border border-emerald-500/40 shadow-inner group-hover:border-emerald-400/60">
                        <span
                          className={`text-base font-black font-mono ${
                            homeWon ? 'text-emerald-400' : 'text-slate-200'
                          }`}
                        >
                          {match.homeScore}
                        </span>
                        <span className="text-slate-500 font-bold">:</span>
                        <span
                          className={`text-base font-black font-mono ${
                            awayWon ? 'text-emerald-400' : 'text-slate-200'
                          }`}
                        >
                          {match.awayScore}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-black text-slate-500 bg-[#0a0c10] px-2.5 py-1 rounded-md border border-slate-800">
                        VS
                      </span>
                    )}
                  </div>

                  {/* Away Team (Team Name Top, Manager Below) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTeam(awayTeam);
                    }}
                    className="col-span-2 flex flex-col items-center text-center cursor-pointer group/away"
                  >
                    <TeamLogo team={awayTeam} size="md" className="mb-1 transition group-hover/away:scale-105" />
                    {/* Club Name First */}
                    <span className="text-xs font-bold text-white group-hover/away:text-emerald-400 transition truncate max-w-full">
                      {awayTeam.clubName}
                    </span>
                    {/* Manager Name Below */}
                    <span className="text-[10px] text-slate-400 truncate max-w-full">
                      {awayTeam.managerName}
                    </span>
                  </div>
                </div>

                {/* Match Notes if any */}
                {isCompleted && match.notes && (
                  <div className="mt-2 text-[10px] text-emerald-200/90 bg-[#061214] p-1.5 rounded border border-emerald-800/40 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{match.notes}</span>
                  </div>
                )}

                {/* Match Card Bottom Actions */}
                <div
                  className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-1.5 ${
                    isCompleted ? 'border-emerald-800/40' : 'border-slate-800/60'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400/80 font-mono">
                        <span>Full Time</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditMatch(match);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewMatchDetail(match);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer bg-[#081518] hover:bg-[#0c1f24] border border-emerald-700/50 text-emerald-300 hover:text-emerald-200"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Match Details</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span>Scheduled</span>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditMatch(match);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm shadow-emerald-500/20 ml-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Submit Score</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
