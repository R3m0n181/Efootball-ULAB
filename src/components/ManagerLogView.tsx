import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Camera,
  Flame,
  Search,
  MessageCircle,
  Sparkles,
  Calendar,
  X,
  UserCheck,
  Filter,
} from 'lucide-react';
import { Match, Team, TournamentConfig } from '../types';
import { TeamLogo } from './TeamLogo';
import { getCachedMatchProof } from '../lib/matchProofs';
import { AdminUser } from '../utils/auth';

export interface ManagerLogViewProps {
  matches: Match[];
  teams: Team[];
  config: TournamentConfig;
  isAdmin?: boolean;
  adminUser?: AdminUser | null;
  getProofForMatch?: (match: Match) => string | null;
  onSelectTeam?: (team: Team) => void;
  onViewMatchDetail?: (match: Match) => void;
}

export interface BacklogWarning {
  severity: 'moderate' | 'high' | 'critical';
  label: string;
  shortLabel: string;
  badgeClass: string;
  counterClass: string;
}

export function getBacklogWarning(pendingCount: number): BacklogWarning | null {
  if (pendingCount > 7) {
    return {
      severity: 'critical',
      label: 'Critical Backlog (>7)',
      shortLabel: 'Critical',
      badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
      counterClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
    };
  }
  if (pendingCount > 5) {
    return {
      severity: 'high',
      label: 'High Backlog (>5)',
      shortLabel: 'High',
      badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
      counterClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
    };
  }
  if (pendingCount > 3) {
    return {
      severity: 'moderate',
      label: 'Moderate Backlog (>3)',
      shortLabel: 'Moderate',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      counterClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    };
  }
  return null;
}

const MY_CLUB_STORAGE_KEY = 'pes_manager_my_club';

export const ManagerLogView: React.FC<ManagerLogViewProps> = ({
  matches,
  teams,
  config,
  isAdmin = false,
  adminUser,
  getProofForMatch,
  onSelectTeam,
  onViewMatchDetail,
}) => {
  // State for My Club selection (persisted in localStorage)
  const [myClubId, setMyClubId] = useState<string>(() => {
    try {
      return localStorage.getItem(MY_CLUB_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // UI States
  const [copiedNudge, setCopiedNudge] = useState(false);
  const [copiedMySchedule, setCopiedMySchedule] = useState(false);
  const [copiedSinglePing, setCopiedSinglePing] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'backlog-desc' | 'backlog-asc' | 'team-asc' | 'team-desc'>('backlog-desc');
  const [activeFilter, setActiveFilter] = useState<'all' | 'backlog' | 'moderate' | 'high' | 'critical' | 'completed'>('all');
  const [isClubPickerOpen, setIsClubPickerOpen] = useState(false);
  const [clubPickerSearch, setClubPickerSearch] = useState('');

  // Filtered teams for club picker search
  const filteredPickerTeams = useMemo(() => {
    if (!clubPickerSearch.trim()) return teams;
    const term = clubPickerSearch.toLowerCase();
    return teams.filter(
      (t) =>
        t.clubName.toLowerCase().includes(term) ||
        t.managerName.toLowerCase().includes(term) ||
        t.shortCode.toLowerCase().includes(term)
    );
  }, [teams, clubPickerSearch]);

  // Save selected club
  const handleSelectMyClub = (clubId: string) => {
    setMyClubId(clubId);
    try {
      if (clubId) {
        localStorage.setItem(MY_CLUB_STORAGE_KEY, clubId);
      } else {
        localStorage.removeItem(MY_CLUB_STORAGE_KEY);
      }
    } catch (e) {
      console.error(e);
    }
    setIsClubPickerOpen(false);
  };

  const resolveProof = useMemo(() => {
    return (m: Match) => {
      if (getProofForMatch) return getProofForMatch(m);
      return m.screenshotUrl || getCachedMatchProof(m.id) || null;
    };
  }, [getProofForMatch]);

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  // Group matches by round to identify partially played matchdays
  const roundData = useMemo(() => {
    const map = new Map<number, { total: number; completed: number; matches: Match[] }>();
    matches.forEach((m) => {
      let r = map.get(m.round);
      if (!r) {
        r = { total: 0, completed: 0, matches: [] };
        map.set(m.round, r);
      }
      r.total += 1;
      r.matches.push(m);
      if (m.status === 'completed' && m.homeScore !== null && m.awayScore !== null) {
        r.completed += 1;
      }
    });

    const partiallyPlayedRounds = Array.from(map.entries())
      .filter(([_, data]) => data.completed > 0 && data.completed < data.total)
      .map(([round]) => round)
      .sort((a, b) => a - b);

    const fullyCompletedRounds = Array.from(map.entries())
      .filter(([_, data]) => data.completed === data.total && data.total > 0)
      .map(([round]) => round)
      .sort((a, b) => a - b);

    return { roundMap: map, partiallyPlayedRounds, fullyCompletedRounds };
  }, [matches]);

  // Calculate manager statistics based ONLY on active partially played matchdays
  const managerStats = useMemo(() => {
    const { partiallyPlayedRounds } = roundData;

    const list = teams.map((team) => {
      const allTeamMatches = matches.filter(
        (m) => m.homeTeamId === team.id || m.awayTeamId === team.id
      );

      // Matches in partially played rounds
      const activeRoundMatches = allTeamMatches.filter((m) =>
        partiallyPlayedRounds.includes(m.round)
      );

      const completedInActive = activeRoundMatches.filter(
        (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
      );

      const pendingInActive = activeRoundMatches.filter(
        (m) => m.status !== 'completed' || m.homeScore === null || m.awayScore === null
      );

      // Overall completed matches & proof compliance
      const allCompleted = allTeamMatches.filter(
        (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
      );
      const withProof = allCompleted.filter((m) => !!resolveProof(m));
      const proofCompliance =
        allCompleted.length > 0 ? Math.round((withProof.length / allCompleted.length) * 100) : 100;

      // Completion rate in active rounds
      const completionRate =
        activeRoundMatches.length > 0
          ? Math.round((completedInActive.length / activeRoundMatches.length) * 100)
          : 100;

      return {
        team,
        totalActiveMatches: activeRoundMatches.length,
        completedActiveCount: completedInActive.length,
        pendingCount: pendingInActive.length,
        pendingMatches: pendingInActive.sort((a, b) => a.round - b.round),
        completionRate,
        totalMatchesPlayed: allCompleted.length,
        proofCompliance,
      };
    });

    list.sort(
      (a, b) =>
        b.pendingCount - a.pendingCount ||
        a.completionRate - b.completionRate ||
        a.team.clubName.localeCompare(b.team.clubName)
    );
    return list;
  }, [teams, matches, roundData, resolveProof]);

  // Summary statistics
  const summary = useMemo(() => {
    const { partiallyPlayedRounds } = roundData;
    const sortedByLagging = [...managerStats].sort(
      (a, b) => b.pendingCount - a.pendingCount || a.completionRate - b.completionRate
    );
    const mostLagging = sortedByLagging.find((m) => m.pendingCount > 0) || sortedByLagging[0];
    const mostActive = [...managerStats].sort((a, b) => b.completedActiveCount - a.completedActiveCount)[0];

    const totalBacklog = managerStats.reduce((acc, m) => acc + m.pendingCount, 0) / 2;
    const managersWithBacklog = managerStats.filter((m) => m.pendingCount > 0).length;
    const managersOnSchedule = managerStats.filter((m) => m.pendingCount === 0).length;

    const moderateBacklogCount = managerStats.filter((m) => m.pendingCount > 3).length;
    const highBacklogCount = managerStats.filter((m) => m.pendingCount > 5).length;
    const criticalBacklogCount = managerStats.filter((m) => m.pendingCount > 7).length;

    const totalActiveRoundsMatches = managerStats.reduce((acc, m) => acc + m.totalActiveMatches, 0) / 2;
    const totalActiveCompleted = managerStats.reduce((acc, m) => acc + m.completedActiveCount, 0) / 2;
    const leaguePacingRate =
      totalActiveRoundsMatches > 0
        ? Math.round((totalActiveCompleted / totalActiveRoundsMatches) * 100)
        : 100;

    return {
      mostLagging,
      mostActive,
      totalBacklog,
      managersWithBacklog,
      managersOnSchedule,
      leaguePacingRate,
      partiallyPlayedRounds,
      moderateBacklogCount,
      highBacklogCount,
      criticalBacklogCount,
    };
  }, [managerStats, roundData]);

  // Selected "My Club" stats
  const myClubStats = useMemo(() => {
    if (!myClubId) return null;
    return managerStats.find((m) => m.team.id === myClubId) || null;
  }, [managerStats, myClubId]);

  // Filtered and sorted managers
  const filteredManagers = useMemo(() => {
    let list = managerStats;

    // Filter tabs
    if (activeFilter === 'backlog') {
      list = list.filter((m) => m.pendingCount > 0);
    } else if (activeFilter === 'moderate') {
      list = list.filter((m) => m.pendingCount > 3);
    } else if (activeFilter === 'high') {
      list = list.filter((m) => m.pendingCount > 5);
    } else if (activeFilter === 'critical') {
      list = list.filter((m) => m.pendingCount > 7);
    } else if (activeFilter === 'completed') {
      list = list.filter((m) => m.pendingCount === 0);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.team.clubName.toLowerCase().includes(term) ||
          m.team.managerName.toLowerCase().includes(term) ||
          m.team.shortCode.toLowerCase().includes(term)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'backlog-desc') {
        return (
          b.pendingCount - a.pendingCount ||
          a.completionRate - b.completionRate ||
          a.team.clubName.localeCompare(b.team.clubName)
        );
      }
      if (sortBy === 'backlog-asc') {
        return (
          a.pendingCount - b.pendingCount ||
          b.completionRate - a.completionRate ||
          a.team.clubName.localeCompare(b.team.clubName)
        );
      }
      if (sortBy === 'team-asc') {
        return a.team.clubName.localeCompare(b.team.clubName);
      }
      if (sortBy === 'team-desc') {
        return b.team.clubName.localeCompare(a.team.clubName);
      }
      return (
        b.pendingCount - a.pendingCount ||
        a.completionRate - b.completionRate ||
        a.team.clubName.localeCompare(b.team.clubName)
      );
    });
  }, [managerStats, activeFilter, searchTerm, sortBy]);

  // Admin Broadcast Nudge
  const handleCopyLeagueNudgeList = () => {
    const laggingManagers = managerStats.filter((m) => m.pendingCount > 0);
    const { partiallyPlayedRounds } = roundData;

    const lines = [
      `📋 *${config.name} — Commissioner Backlog Notice* 📋`,
      partiallyPlayedRounds.length > 0
        ? `Active Matchdays in Progress: ${partiallyPlayedRounds.map((r) => `Round ${r}`).join(', ')}`
        : `All active matchdays are up to date!`,
      `The following managers have pending fixtures holding up partially played matchdays:`,
      '',
      ...(laggingManagers.length > 0
        ? laggingManagers.map((m, idx) => {
            const opponents = m.pendingMatches
              .map((pm) => {
                const oppId = pm.homeTeamId === m.team.id ? pm.awayTeamId : pm.homeTeamId;
                return `${teamMap.get(oppId)?.clubName || 'Opponent'} (R${pm.round})`;
              })
              .join(', ');

            return `${idx + 1}. *${m.team.clubName}* (@${m.team.managerName}) — ${m.pendingCount} pending [${opponents}]`;
          })
        : ['✨ No managers are currently backlogged! All active matchdays are completed.']),
      '',
      '⚡ Please coordinate with your opponents to play and submit match results with screenshots.',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedNudge(true);
    setTimeout(() => setCopiedNudge(false), 2500);
  };

  // Admin Single Manager Direct DM/Ping
  const handleCopySingleManagerPing = (m: (typeof managerStats)[0], e: React.MouseEvent) => {
    e.stopPropagation();
    const opponents = m.pendingMatches
      .map((pm) => {
        const oppId = pm.homeTeamId === m.team.id ? pm.awayTeamId : pm.homeTeamId;
        const opp = teamMap.get(oppId);
        return `• Round ${pm.round}: vs ${opp?.clubName || 'Opponent'} (@${opp?.managerName || 'manager'})`;
      })
      .join('\n');

    const message = `📢 *Commissioner Reminder for @${m.team.managerName} (${m.team.clubName})*:\nYou currently have ${m.pendingCount} pending match(es) in active matchdays:\n${opponents}\nPlease coordinate with your opponents to play as soon as possible! ⚽`;

    navigator.clipboard.writeText(message);
    setCopiedSinglePing(m.team.id);
    setTimeout(() => setCopiedSinglePing(null), 2500);
  };

  // Member "Copy My Match Schedule"
  const handleCopyMyMatchSchedule = () => {
    if (!myClubStats) return;

    if (myClubStats.pendingMatches.length === 0) {
      const text = `🎉 *${myClubStats.team.clubName}* (@${myClubStats.team.managerName}) is 100% caught up on all active matchdays in ${config.name}!`;
      navigator.clipboard.writeText(text);
      setCopiedMySchedule(true);
      setTimeout(() => setCopiedMySchedule(false), 2500);
      return;
    }

    const opponentPings = myClubStats.pendingMatches
      .map((pm) => {
        const oppId = pm.homeTeamId === myClubStats.team.id ? pm.awayTeamId : pm.homeTeamId;
        const opp = teamMap.get(oppId);
        return `• Round ${pm.round}: vs ${opp?.clubName} (@${opp?.managerName})`;
      })
      .join('\n');

    const text = `⚽ *Match Coordination for ${myClubStats.team.clubName}* (@${myClubStats.team.managerName})\nReady to play active league fixtures:\n${opponentPings}\nPlease reply or DM me when you are available to play!`;

    navigator.clipboard.writeText(text);
    setCopiedMySchedule(true);
    setTimeout(() => setCopiedMySchedule(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isAdmin
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide">
                  {isAdmin ? 'Manager Log & Backlog' : 'Manager Log & Fixture Pacing'}
                </h2>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    Commissioner Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    League Directory
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAdmin
                  ? 'Audit club pacing, monitor unplayed fixtures, and broadcast reminders to managers.'
                  : 'Check league pacing, inspect opponent contacts, and coordinate your upcoming matches.'}
              </p>
            </div>
          </div>

          {/* Quick Action in Header */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
            {/* Find My Club Trigger */}
            <div className="relative">
              <button
                id="btn-find-my-club"
                onClick={() => {
                  setIsClubPickerOpen(!isClubPickerOpen);
                  setClubPickerSearch('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer ${
                  myClubStats
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-[#141824] hover:bg-[#1a2030] text-slate-300 border-slate-700'
                }`}
                title="Select your club to highlight your fixtures"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{myClubStats ? `My Club: ${myClubStats.team.shortCode}` : 'Find My Club'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Club Picker - Mobile Bottom Sheet & Desktop Popover */}
              {isClubPickerOpen && (
                <>
                  {/* Backdrop for mobile & outside click closing */}
                  <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 sm:hidden"
                    onClick={() => setIsClubPickerOpen(false)}
                  />

                  {/* Picker Container */}
                  <div
                    className="fixed inset-x-0 bottom-0 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:bottom-auto mt-0 sm:mt-2 w-full sm:w-72 bg-[#0e121a] border border-slate-700/90 rounded-t-2xl sm:rounded-xl shadow-2xl p-3 sm:p-2.5 max-h-[80vh] sm:max-h-96 flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-2 duration-150"
                  >
                    {/* Header bar / Mobile drag handle indicator */}
                    <div className="sm:hidden w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2.5" />

                    <div className="text-xs font-semibold text-slate-300 px-1 py-1 flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        <span>Find My Club</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {myClubId && (
                          <button
                            onClick={() => handleSelectMyClub('')}
                            className="text-rose-400 hover:text-rose-300 text-[11px] font-medium px-2 py-0.5 rounded hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            Clear Selection
                          </button>
                        )}
                        <button
                          onClick={() => setIsClubPickerOpen(false)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer sm:hidden"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Search Input */}
                    <div className="relative mb-2 px-1">
                      <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={clubPickerSearch}
                        onChange={(e) => setClubPickerSearch(e.target.value)}
                        placeholder="Search club or manager..."
                        className="w-full bg-[#141824] border border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500/60"
                        autoFocus
                      />
                      {clubPickerSearch && (
                        <button
                          onClick={() => setClubPickerSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Clubs List */}
                    <div className="space-y-1 overflow-y-auto pr-0.5 max-h-[55vh] sm:max-h-64 divide-y divide-slate-800/40">
                      {filteredPickerTeams.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          No clubs match "{clubPickerSearch}"
                        </div>
                      ) : (
                        filteredPickerTeams.map((t) => {
                          const isSelected = t.id === myClubId;
                          return (
                            <button
                              key={t.id}
                              onClick={() => handleSelectMyClub(t.id)}
                              className={`w-full px-2.5 py-2 sm:py-1.5 rounded-lg text-xs flex items-center gap-3 transition text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                                  : 'text-slate-300 hover:bg-slate-800/80 active:bg-slate-800'
                              }`}
                            >
                              <TeamLogo team={t} size="xs" />
                              <div className="min-w-0 flex-1">
                                <span className="truncate block font-semibold text-slate-200">{t.clubName}</span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  @{t.managerName} • {t.shortCode}
                                </span>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Admin Broadcast Button */}
            {isAdmin && (
              <button
                id="btn-copy-league-nudge"
                onClick={handleCopyLeagueNudgeList}
                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Copy entire league backlog list formatted for WhatsApp or Discord"
              >
                {copiedNudge ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nudge List Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Nudge List</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* "My Club" Spotlight Banner (If a club is selected) */}
      {myClubStats && (
        <div className="bg-gradient-to-r from-emerald-950/30 via-[#0d151c] to-[#0f1219] border border-emerald-500/40 rounded-xl p-3.5 sm:p-4 shadow-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TeamLogo team={myClubStats.team} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500 text-slate-950">
                    My Club Spotlight
                  </span>
                  <span className="text-xs text-slate-400">@{myClubStats.team.managerName}</span>
                </div>
                <h3 className="text-base font-black text-white mt-0.5">{myClubStats.team.clubName}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                  <span>
                    Active Matchdays:{' '}
                    <strong className="text-white">
                      {myClubStats.completedActiveCount}/{myClubStats.totalActiveMatches}
                    </strong>{' '}
                    played
                  </span>
                  <span>•</span>
                  <span className="font-mono text-emerald-400 font-bold">{myClubStats.completionRate}% complete</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
              <button
                onClick={handleCopyMyMatchSchedule}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                title="Copy ready-to-paste message to coordinate with your active opponents"
              >
                {copiedMySchedule ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                <span>{copiedMySchedule ? 'Message Copied!' : 'Copy Match Request'}</span>
              </button>

              <button
                onClick={() => handleSelectMyClub('')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1"
                title="Clear selected club"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Pending Matchups for My Club */}
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Your upcoming fixtures in active matchdays:</span>
              {myClubStats.pendingMatches.length === 0 ? (
                <span className="text-emerald-400 font-bold">100% Up to Date! 🎉</span>
              ) : (
                <span className="text-amber-400 font-mono font-bold">
                  {myClubStats.pendingMatches.length} match{myClubStats.pendingMatches.length > 1 ? 'es' : ''} to play
                </span>
              )}
            </div>

            {myClubStats.pendingMatches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {myClubStats.pendingMatches.map((pm) => {
                  const isHome = pm.homeTeamId === myClubStats.team.id;
                  const oppId = isHome ? pm.awayTeamId : pm.homeTeamId;
                  const opponent = teamMap.get(oppId);

                  return (
                    <div
                      key={pm.id}
                      onClick={() => onViewMatchDetail?.(pm)}
                      className="p-2.5 rounded-lg bg-[#0b0e14]/90 border border-slate-700/80 hover:border-emerald-500/50 transition flex items-center justify-between gap-2 text-xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold text-[10px] shrink-0 border border-slate-700/60">
                          R{pm.round}
                        </span>
                        <span className="text-slate-400 text-[10px] font-semibold shrink-0">
                          {isHome ? '(H)' : '(A)'}
                        </span>
                        <TeamLogo team={opponent} size="xs" />
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate group-hover:text-emerald-300">
                            vs {opponent?.clubName}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            @{opponent?.managerName}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-1">
                You have played all assigned fixtures in the currently opened rounds. Great job!
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 Summary Cards (Role-tailored metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {isAdmin ? (
          <>
            <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Pending Fixtures</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {summary.totalBacklog}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Across {summary.managersWithBacklog} backlogged clubs
              </div>
            </div>

            <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Most Backlogged</span>
                <Flame className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-base sm:text-lg font-bold text-white truncate">
                {summary.mostLagging ? summary.mostLagging.team.clubName : 'None'}
              </div>
              <div className="text-[11px] text-rose-400 mt-1 font-mono">
                {summary.mostLagging?.pendingCount || 0} unplayed fixtures
              </div>
            </div>

            <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Pacing Leader</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-base sm:text-lg font-bold text-white truncate">
                {summary.mostActive ? summary.mostActive.team.clubName : 'None'}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 font-mono">
                {summary.mostActive?.completedActiveCount || 0} active played
              </div>
            </div>

            <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Active Rounds</span>
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                {summary.partiallyPlayedRounds.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                {summary.partiallyPlayedRounds.length > 0
                  ? summary.partiallyPlayedRounds.map((r) => `R${r}`).join(', ')
                  : 'All caught up'}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Active Matchdays</span>
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                {summary.partiallyPlayedRounds.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                {summary.partiallyPlayedRounds.length > 0
                  ? summary.partiallyPlayedRounds.map((r) => `Round ${r}`).join(', ')
                  : 'All up to date'}
              </div>
            </div>

            <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>League Pacing</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {summary.leaguePacingRate}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Active round fixtures played
              </div>
            </div>

            <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>On Schedule</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {summary.managersOnSchedule}
                <span className="text-xs text-slate-400 font-normal ml-1">/ {teams.length}</span>
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">
                Clubs with 0 backlog
              </div>
            </div>

            <div className="bg-[#141824] border border-slate-800 rounded-xl p-3 sm:p-3.5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Pacing Leader</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-base sm:text-lg font-bold text-white truncate">
                {summary.mostActive ? summary.mostActive.team.clubName : 'None'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {summary.mostActive?.completedActiveCount || 0} active played
              </div>
            </div>
          </>
        )}
      </div>

      {/* Shortest Possible Mobile-First Warning Banner */}
      {summary.partiallyPlayedRounds.length > 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg sm:rounded-xl px-2.5 py-2 sm:p-3 flex items-center gap-2 text-[11px] sm:text-xs text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <p className="leading-snug">
            Backlog only counts unplayed matches in active rounds:{' '}
            <span className="font-mono font-semibold text-white">
              {summary.partiallyPlayedRounds.map((r) => `R${r}`).join(', ')}
            </span>
          </p>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg sm:rounded-xl px-2.5 py-2 sm:p-3 flex items-center gap-2 text-[11px] sm:text-xs text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <p className="leading-snug">All active rounds completed — 0 backlog.</p>
        </div>
      )}

      {/* Directory Table / List Container */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-3.5 py-3 border-b border-slate-800 bg-[#0a0c10] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {isAdmin ? 'Commissioner Manager Backlog Ledger' : 'Club Directory & Match Status'}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-44">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search club / manager..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-[#141824] border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="hidden sm:inline">Sort:</span>
              <select
                id="manager-log-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#141824] border border-slate-700/80 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="backlog-desc">Highest Backlog</option>
                <option value="backlog-asc">Lowest Backlog</option>
                <option value="team-asc">Team Name (A-Z)</option>
                <option value="team-desc">Team Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div className="px-3.5 py-2 border-b border-slate-800/80 bg-[#0c0f16] flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[11px] text-slate-500 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filter:
          </span>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All Clubs ({managerStats.length})
          </button>

          <button
            onClick={() => setActiveFilter('backlog')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition whitespace-nowrap cursor-pointer ${
              activeFilter === 'backlog'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Pending Active ({summary.managersWithBacklog})
          </button>

          {summary.moderateBacklogCount > 0 && (
            <button
              onClick={() => setActiveFilter('moderate')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition whitespace-nowrap cursor-pointer ${
                activeFilter === 'moderate'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-amber-300 hover:bg-amber-500/10 border border-amber-500/30'
              }`}
            >
              Moderate &gt;3 ({summary.moderateBacklogCount})
            </button>
          )}

          {summary.highBacklogCount > 0 && (
            <button
              onClick={() => setActiveFilter('high')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition whitespace-nowrap cursor-pointer ${
                activeFilter === 'high'
                  ? 'bg-orange-500 text-slate-950 shadow-sm'
                  : 'text-orange-300 hover:bg-orange-500/10 border border-orange-500/30'
              }`}
            >
              High &gt;5 ({summary.highBacklogCount})
            </button>
          )}

          {summary.criticalBacklogCount > 0 && (
            <button
              onClick={() => setActiveFilter('critical')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition whitespace-nowrap cursor-pointer ${
                activeFilter === 'critical'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-rose-300 hover:bg-rose-500/10 border border-rose-500/30'
              }`}
            >
              Critical &gt;7 ({summary.criticalBacklogCount})
            </button>
          )}

          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition whitespace-nowrap cursor-pointer ${
              activeFilter === 'completed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            100% Up to Date ({summary.managersOnSchedule})
          </button>
        </div>

        {/* Manager Rows */}
        <div className="divide-y divide-slate-800/80">
          {filteredManagers.map((m, idx) => {
            const isExpanded = expandedTeamId === m.team.id;
            const warning = getBacklogWarning(m.pendingCount);
            const isMyClub = m.team.id === myClubId;

            return (
              <div
                key={m.team.id}
                className={`transition-colors ${
                  isMyClub
                    ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                    : 'hover:bg-slate-900/40'
                }`}
              >
                <div
                  onClick={() => setExpandedTeamId(isExpanded ? null : m.team.id)}
                  className="p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-500 w-5 shrink-0">
                      #{idx + 1}
                    </span>

                    <TeamLogo team={m.team} size="sm" />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {m.team.clubName}
                        </span>
                        <span className="text-slate-400 text-xs truncate">
                          (@{m.team.managerName})
                        </span>

                        {isMyClub && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-500 text-slate-950">
                            My Club
                          </span>
                        )}

                        {warning && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${warning.badgeClass}`}>
                            {warning.shortLabel}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                        <span className="text-slate-300">
                          Active rounds:{' '}
                          <strong className="text-white">{m.completedActiveCount}</strong>/
                          {m.totalActiveMatches} played
                        </span>
                        <span>•</span>
                        <span>{m.totalMatchesPlayed} total played</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Camera className="w-3 h-3 text-cyan-400" />
                          <span
                            className={
                              m.proofCompliance < 50 ? 'text-amber-400 font-bold' : ''
                            }
                          >
                            {m.proofCompliance}% proof
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side stats & action */}
                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-800/60 pt-2 md:pt-0">
                    {/* Active Pacing Bar */}
                    <div className="w-24 sm:w-28">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Pacing</span>
                        <span className="font-mono font-bold text-slate-200">
                          {m.completionRate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            m.completionRate >= 80
                              ? 'bg-emerald-500'
                              : m.completionRate >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${m.completionRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Admin Ping Button */}
                    {isAdmin && m.pendingCount > 0 && (
                      <button
                        onClick={(e) => handleCopySingleManagerPing(m, e)}
                        className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Copy direct reminder message for this manager"
                      >
                        {copiedSinglePing === m.team.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Ping Copied!</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-3 h-3" />
                            <span>Ping</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                          m.pendingCount === 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : warning
                            ? warning.counterClass
                            : 'bg-slate-800/80 text-slate-300 border border-slate-700/80'
                        }`}
                      >
                        {m.pendingCount === 0 ? 'Caught Up' : `${m.pendingCount} Pending`}
                      </span>

                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Pending Matches */}
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-4 pt-1 bg-[#0a0d14] border-t border-slate-800/60">
                    <div className="flex items-center justify-between mt-2 mb-2 text-xs flex-wrap gap-1">
                      <span className="font-semibold text-slate-300">
                        Pending fixtures in partially played matchdays for {m.team.clubName}:
                      </span>
                      {m.pendingMatches.length === 0 && (
                        <span className="text-emerald-400 font-medium">All active fixtures completed!</span>
                      )}
                    </div>

                    {m.pendingMatches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {m.pendingMatches.map((pm) => {
                          const isHome = pm.homeTeamId === m.team.id;
                          const oppId = isHome ? pm.awayTeamId : pm.homeTeamId;
                          const opponent = teamMap.get(oppId);

                          return (
                            <div
                              key={pm.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewMatchDetail?.(pm);
                              }}
                              className="p-2.5 sm:p-3 rounded-xl bg-[#111420] border border-slate-800 hover:border-amber-500/50 hover:bg-[#141828] transition flex items-center justify-between gap-2.5 text-xs cursor-pointer group"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold text-[11px] shrink-0 border border-slate-700/60">
                                  R{pm.round}
                                </span>
                                <span className="text-slate-400 text-[10px] font-semibold shrink-0">
                                  {isHome ? '(H)' : '(A)'}
                                </span>
                                <TeamLogo team={opponent} size="xs" />
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-200 block truncate group-hover:text-white">
                                    vs {opponent?.clubName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    @{opponent?.managerName}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Unplayed
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 py-2">
                        No outstanding fixtures in partially played matchdays for this club.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Description & Legend Guide */}
      <div className="bg-[#0f1219]/90 border border-slate-800/80 rounded-xl p-3 sm:p-4 text-xs text-slate-400 space-y-3">
        <div className="flex items-center gap-2 text-slate-200 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>How the Manager Log & Backlog Works</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 text-[11px] sm:text-xs">
          <div className="space-y-1">
            <span className="font-semibold text-white block">Active Matchdays Only</span>
            <p className="leading-relaxed text-slate-400">
              Backlog counts unplayed matches strictly within rounds that have already started. Future rounds not yet opened do not count against managers.
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-semibold text-white block">Pacing & Proof Audit</span>
            <p className="leading-relaxed text-slate-400">
              The progress bar reflects completion rate across active rounds. The camera indicator tracks the percentage of submitted results verified with screenshot proofs.
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-semibold text-white block">Inspect Fixtures & Opponents</span>
            <p className="leading-relaxed text-slate-400">
              Tap any club row to view specific unplayed match cards with opponent tags and head-to-head match details.
            </p>
          </div>
        </div>

        {/* Backlog Warning Badges Legend */}
        <div className="pt-3 border-t border-slate-800/80">
          <span className="font-semibold text-white text-[11px] block mb-2">
            Club Status & Warning Badges:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
            <div className="flex items-start gap-2 p-2 rounded-lg bg-[#141824]/60 border border-slate-800">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap shrink-0">
                Caught Up
              </span>
              <span className="text-slate-400 text-[11px] leading-tight">
                <strong>0 pending:</strong> All assigned fixtures in started rounds are 100% completed.
              </span>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-[#141824]/60 border border-amber-500/20">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap shrink-0">
                Moderate (&gt;3)
              </span>
              <span className="text-slate-400 text-[11px] leading-tight">
                <strong>4–5 pending:</strong> Schedule is beginning to lag; managers should coordinate games.
              </span>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-[#141824]/60 border border-orange-500/20">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 whitespace-nowrap shrink-0">
                High (&gt;5)
              </span>
              <span className="text-slate-400 text-[11px] leading-tight">
                <strong>6–7 pending:</strong> Significant delay holding back matchday progressions.
              </span>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-[#141824]/60 border border-rose-500/20">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap shrink-0">
                Critical (&gt;7)
              </span>
              <span className="text-slate-400 text-[11px] leading-tight">
                <strong>8+ pending:</strong> Severe tournament bottleneck requiring commissioner intervention.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerLogView;
