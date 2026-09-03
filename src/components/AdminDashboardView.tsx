import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  ExternalLink,
  Edit3,
  Sparkles,
  Trophy,
  Activity,
  ChevronRight,
  TrendingUp,
  X,
  Lock,
  User,
  Check,
  Copy,
  ShieldAlert,
  FileSpreadsheet,
  Layers,
  Calendar,
  CalendarDays,
  CalendarRange,
  ArrowRight,
  Users,
} from 'lucide-react';
import { Match, Team, TournamentConfig } from '../types';
import { TeamLogo } from './TeamLogo';
import { AdminUser } from '../utils/auth';
import { subscribeToAllMatchProofs, getCachedMatchProof } from '../lib/matchProofs';
import {
  getMatchRealLifeTimestamp,
  getLocalDateKey,
  formatMatchRealLifeDateTime,
  getDayKeyHumanLabel,
  groupMatchesByRealLifeDay,
} from '../utils/matchDateUtils';
import { AdminPacingTab } from './admin/AdminPacingTab';
import { AdminFairPlayTab } from './admin/AdminFairPlayTab';
import { AdminReportsTab } from './admin/AdminReportsTab';

interface AdminDashboardViewProps {
  matches: Match[];
  teams: Team[];
  config: TournamentConfig;
  adminUser: AdminUser | null;
  onOpenLoginModal: () => void;
  onEditMatch: (match: Match) => void;
  onViewMatchDetail: (match: Match) => void;
  onSelectTeam: (team: Team) => void;
  onResetMatchScore?: (matchId: string) => void;
  onOpenSubmitModal: () => void;
  onApproveMatch?: (matchId: string, notes?: string) => Promise<void> | void;
  onRevokeApproval?: (matchId: string) => Promise<void> | void;
  onBatchApproveMatches?: (matchIds: string[]) => Promise<void> | void;
  onNavigateToManagerLog?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  matches,
  teams,
  config,
  adminUser,
  onOpenLoginModal,
  onEditMatch,
  onViewMatchDetail,
  onSelectTeam,
  onOpenSubmitModal,
  onApproveMatch,
  onRevokeApproval,
  onBatchApproveMatches,
  onNavigateToManagerLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'with-proof' | 'missing-proof' | 'high-scoring' | 'draws'>('all');
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'yesterday' | 'last7' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [viewLayout, setViewLayout] = useState<'timeline' | 'flat'>('timeline');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'round-asc' | 'round-desc' | 'goals-desc' | 'team-asc' | 'team-desc'>('recent');
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<{ url: string; matchTitle: string; score: string } | null>(null);
  const [copiedAuditText, setCopiedAuditText] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<'ledger' | 'pacing' | 'fairplay' | 'reports'>('ledger');
  const [proofsMap, setProofsMap] = useState<Map<string, string>>(() => new Map());
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Real-time synchronization with match proofs collection and local cache
  useEffect(() => {
    const unsubscribe = subscribeToAllMatchProofs((updatedMap) => {
      setProofsMap(new Map(updatedMap));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Helper to retrieve proof for a match from either real-time proofsMap, direct match object, or local cache
  const getProofForMatch = (match: Match): string | null => {
    return proofsMap.get(match.id) || match.screenshotUrl || getCachedMatchProof(match.id) || null;
  };

  // Map teams for fast O(1) lookup
  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  // Completed matches only for submission dashboard
  const completedMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'completed');
  }, [matches]);

  const totalMatches = matches.length;
  const completedCount = completedMatches.length;
  const scheduledCount = totalMatches - completedCount;
  const progressPercent = totalMatches > 0 ? Math.round((completedCount / totalMatches) * 100) : 0;

  // Real-life date activity stats
  const realLifeDateStats = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterdayDate);
    const sevenDaysAgoTs = Date.now() - 7 * 86400000;

    let todayCount = 0;
    let yesterdayCount = 0;
    let last7Count = 0;
    const dayCountsMap = new Map<string, number>();

    completedMatches.forEach((m) => {
      const ts = getMatchRealLifeTimestamp(m);
      if (!ts) return;
      const dayKey = getLocalDateKey(ts);
      dayCountsMap.set(dayKey, (dayCountsMap.get(dayKey) || 0) + 1);

      if (dayKey === todayKey) todayCount++;
      if (dayKey === yesterdayKey) yesterdayCount++;
      if (ts >= sevenDaysAgoTs) last7Count++;
    });

    const dayPills: Array<{ dayKey: string; label: string; count: number }> = [];
    dayCountsMap.forEach((count, key) => {
      const { mainLabel } = getDayKeyHumanLabel(key);
      dayPills.push({ dayKey: key, label: mainLabel, count });
    });
    dayPills.sort((a, b) => b.dayKey.localeCompare(a.dayKey));

    return {
      todayCount,
      yesterdayCount,
      last7Count,
      distinctDaysCount: dayCountsMap.size,
      dayPills,
    };
  }, [completedMatches]);

  // Stats calculation
  const matchesWithProof = useMemo(() => {
    return completedMatches.filter((m) => !!getProofForMatch(m));
  }, [completedMatches, proofsMap]);

  const matchesMissingProof = useMemo(() => {
    return completedMatches.filter((m) => !getProofForMatch(m));
  }, [completedMatches, proofsMap]);

  const proofRate = completedCount > 0 ? Math.round((matchesWithProof.length / completedCount) * 100) : 0;

  const pendingFlaggedCount = useMemo(() => {
    return completedMatches.filter((m) => {
      const diff = Math.abs((m.homeScore || 0) - (m.awayScore || 0));
      const sum = (m.homeScore || 0) + (m.awayScore || 0);
      return (diff >= 4 || sum >= 6) && !m.auditApproved;
    }).length;
  }, [completedMatches]);

  const totalGoals = useMemo(() => {
    return completedMatches.reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0);
  }, [completedMatches]);

  const avgGoalsPerMatch = completedCount > 0 ? (totalGoals / completedCount).toFixed(2) : '0.00';

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    let list = [...completedMatches];

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
        const notes = (m.notes || '').toLowerCase();
        const submitter = (m.submittedBy || '').toLowerCase();
        const roundStr = `round ${m.round} matchday ${m.round}`;

        return (
          homeName.includes(term) ||
          homeManager.includes(term) ||
          awayName.includes(term) ||
          awayManager.includes(term) ||
          notes.includes(term) ||
          submitter.includes(term) ||
          roundStr.includes(term)
        );
      });
    }

    // Round filter
    if (selectedRoundFilter !== 'all') {
      const rNum = parseInt(selectedRoundFilter, 10);
      list = list.filter((m) => m.round === rNum);
    }

    // Mode filter
    if (filterMode === 'with-proof') {
      list = list.filter((m) => !!getProofForMatch(m));
    } else if (filterMode === 'missing-proof') {
      list = list.filter((m) => !getProofForMatch(m));
    } else if (filterMode === 'high-scoring') {
      list = list.filter((m) => (m.homeScore || 0) + (m.awayScore || 0) >= 5);
    } else if (filterMode === 'draws') {
      list = list.filter((m) => m.homeScore === m.awayScore);
    }

    // Real-Life Date Filter
    if (dateFilterMode === 'today') {
      const todayKey = getLocalDateKey(new Date());
      list = list.filter((m) => {
        const ts = getMatchRealLifeTimestamp(m);
        return ts ? getLocalDateKey(ts) === todayKey : false;
      });
    } else if (dateFilterMode === 'yesterday') {
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayKey = getLocalDateKey(yesterdayDate);
      list = list.filter((m) => {
        const ts = getMatchRealLifeTimestamp(m);
        return ts ? getLocalDateKey(ts) === yesterdayKey : false;
      });
    } else if (dateFilterMode === 'last7') {
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      list = list.filter((m) => {
        const ts = getMatchRealLifeTimestamp(m);
        return ts ? ts >= sevenDaysAgo : false;
      });
    } else if (dateFilterMode === 'custom' && customDate) {
      list = list.filter((m) => {
        const ts = getMatchRealLifeTimestamp(m);
        return ts ? getLocalDateKey(ts) === customDate : false;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'recent') {
        const tsA = getMatchRealLifeTimestamp(a) || 0;
        const tsB = getMatchRealLifeTimestamp(b) || 0;
        if (tsB !== tsA) return tsB - tsA;
        return b.round - a.round;
      }
      if (sortBy === 'oldest') {
        const tsA = getMatchRealLifeTimestamp(a) || 0;
        const tsB = getMatchRealLifeTimestamp(b) || 0;
        if (tsA !== tsB) return tsA - tsB;
        return a.round - b.round;
      }
      if (sortBy === 'round-asc') return a.round - b.round;
      if (sortBy === 'round-desc') return b.round - a.round;
      if (sortBy === 'goals-desc') {
        const goalsA = (a.homeScore || 0) + (a.awayScore || 0);
        const goalsB = (b.homeScore || 0) + (b.awayScore || 0);
        return goalsB - goalsA;
      }
      if (sortBy === 'team-asc') {
        const homeA = teamMap.get(a.homeTeamId)?.clubName || '';
        const homeB = teamMap.get(b.homeTeamId)?.clubName || '';
        return homeA.localeCompare(homeB);
      }
      if (sortBy === 'team-desc') {
        const homeA = teamMap.get(a.homeTeamId)?.clubName || '';
        const homeB = teamMap.get(b.homeTeamId)?.clubName || '';
        return homeB.localeCompare(homeA);
      }
      return 0;
    });

    return list;
  }, [
    completedMatches,
    searchTerm,
    selectedRoundFilter,
    filterMode,
    dateFilterMode,
    customDate,
    sortBy,
    teamMap,
    proofsMap,
  ]);

  // Group filtered submissions by real-life day
  const groupedSubmissionsByDay = useMemo(() => {
    return groupMatchesByRealLifeDay(
      filteredSubmissions,
      sortBy === 'oldest' ? 'asc' : 'desc'
    );
  }, [filteredSubmissions, sortBy]);

  // Determine the most recent calendar day among visible groups
  const mostRecentDayKey = useMemo(() => {
    if (groupedSubmissionsByDay.length === 0) return null;
    const validGroups = groupedSubmissionsByDay.filter((g) => g.dayKey !== 'unknown');
    if (validGroups.length > 0) {
      return [...validGroups].sort((a, b) => b.dayKey.localeCompare(a.dayKey))[0].dayKey;
    }
    return groupedSubmissionsByDay[0].dayKey;
  }, [groupedSubmissionsByDay]);

  // Check if a day group is expanded (by default, ONLY the recent day stays open & others closed)
  const isDayExpanded = (dayKey: string) => {
    if (expandedDays[dayKey] !== undefined) {
      return expandedDays[dayKey];
    }
    return dayKey === mostRecentDayKey;
  };

  const toggleDayExpanded = (dayKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayKey]: !isDayExpanded(dayKey),
    }));
  };

  const allDaysExpanded = useMemo(() => {
    if (groupedSubmissionsByDay.length === 0) return false;
    return groupedSubmissionsByDay.every((g) => isDayExpanded(g.dayKey));
  }, [groupedSubmissionsByDay, expandedDays, mostRecentDayKey]);

  const expandAllDays = () => {
    const next: Record<string, boolean> = {};
    groupedSubmissionsByDay.forEach((g) => {
      next[g.dayKey] = true;
    });
    setExpandedDays(next);
  };

  const collapseAllDays = () => {
    const next: Record<string, boolean> = {};
    groupedSubmissionsByDay.forEach((g) => {
      next[g.dayKey] = false;
    });
    setExpandedDays(next);
  };

  // Generate audit summary for Discord / WhatsApp clipboard copy
  const handleCopyAuditSummary = () => {
    const summaryLines = [
      `📋 *${config.name} - Match Submissions Audit Report*`,
      `📅 Generated: ${new Date().toLocaleString()}`,
      `📊 Completed: ${completedCount}/${totalMatches} matches (${progressPercent}%)`,
      `📸 Proof attached: ${matchesWithProof.length}/${completedCount} (${proofRate}%)`,
      `⚠️ Needs Proof: ${matchesMissingProof.length} matches`,
      `⚽ Total Goals: ${totalGoals} (${avgGoalsPerMatch} avg/match)`,
      '',
      '--- Recent 10 Submissions ---',
      ...completedMatches.slice(0, 10).map((m) => {
        const home = teamMap.get(m.homeTeamId);
        const away = teamMap.get(m.awayTeamId);
        const proofUrl = getProofForMatch(m);
        const proofTag = proofUrl ? '📸 [Verified]' : '⚠️ [No Proof]';
        const { dateStr, timeStr } = formatMatchRealLifeDateTime(m);
        const dateTag = dateStr !== 'No date recorded' ? ` [${dateStr}${timeStr ? ` ${timeStr}` : ''}]` : '';
        return `• Round ${m.round}: ${home?.clubName || 'Unknown'} ${m.homeScore}-${m.awayScore} ${away?.clubName || 'Unknown'} ${proofTag}${dateTag}`;
      }),
    ];

    navigator.clipboard.writeText(summaryLines.join('\n'));
    setCopiedAuditText(true);
    setTimeout(() => setCopiedAuditText(false), 2000);
  };

  const allRounds = useMemo(() => {
    const roundsSet = new Set<number>();
    matches.forEach((m) => roundsSet.add(m.round));
    return Array.from(roundsSet).sort((a, b) => a - b);
  }, [matches]);

  // Operational Backlog Summary (calculates active bottlenecks across partially played matchdays)
  const activeBacklogSummary = useMemo(() => {
    const roundMap = new Map<number, { total: number; completed: number; matches: Match[] }>();
    matches.forEach((m) => {
      const r = roundMap.get(m.round) || { total: 0, completed: 0, matches: [] };
      r.total += 1;
      if (m.status === 'completed' && m.homeScore !== null) {
        r.completed += 1;
      }
      r.matches.push(m);
      roundMap.set(m.round, r);
    });

    const activeRounds: number[] = [];
    roundMap.forEach((data, roundNum) => {
      if (data.completed > 0 && data.completed < data.total) {
        activeRounds.push(roundNum);
      }
    });
    activeRounds.sort((a, b) => a - b);

    const teamBacklogMap = new Map<string, number>();
    let totalActivePendingMatches = 0;

    activeRounds.forEach((r) => {
      const data = roundMap.get(r);
      if (!data) return;
      data.matches.forEach((m) => {
        if (m.status !== 'completed' || m.homeScore === null) {
          totalActivePendingMatches++;
          teamBacklogMap.set(m.homeTeamId, (teamBacklogMap.get(m.homeTeamId) || 0) + 1);
          teamBacklogMap.set(m.awayTeamId, (teamBacklogMap.get(m.awayTeamId) || 0) + 1);
        }
      });
    });

    const laggingTeams: Array<{ team: Team; count: number }> = [];
    teamBacklogMap.forEach((count, teamId) => {
      const t = teamMap.get(teamId);
      if (t && count > 0) {
        laggingTeams.push({ team: t, count });
      }
    });
    laggingTeams.sort((a, b) => b.count - a.count);

    const criticalCount = laggingTeams.filter((t) => t.count > 7).length;
    const highCount = laggingTeams.filter((t) => t.count > 5).length;
    const moderateCount = laggingTeams.filter((t) => t.count > 3).length;

    return {
      activeRounds,
      totalActivePendingMatches,
      laggingTeams,
      criticalCount,
      highCount,
      moderateCount,
      hasBottlenecks: totalActivePendingMatches > 0,
    };
  }, [matches, teamMap]);

  return (
    <div className="space-y-4">
      {/* Top Banner & KPI Stats Grid */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Admin Match Submission Dashboard
              </h2>
              {adminUser ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                  Authorized Admin
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-[10px]">
                  Read-Only Preview
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Live audit ledger, match verification proofs, and score administration for {config.name}.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyAuditSummary}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Copy audit report for WhatsApp or Discord"
            >
              {copiedAuditText ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedAuditText ? 'Report Copied!' : 'Copy Audit Report'}</span>
            </button>

            {!adminUser && (
              <button
                onClick={onOpenLoginModal}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Login as Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4">
          {/* Card 1: Completed vs Total */}
          <div className="bg-[#141824] border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="font-semibold">Match Submissions</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {completedCount} <span className="text-xs font-normal text-slate-400">/ {totalMatches}</span>
            </div>
            <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span>{progressPercent}% Complete</span>
              <span>{scheduledCount} Pending</span>
            </div>
          </div>

          {/* Card 2: Proof Verification Rate */}
          <div className="bg-[#141824] border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="font-semibold">Proof Screenshot Rate</span>
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono flex items-baseline gap-1.5">
              <span>{proofRate}%</span>
              <span className="text-xs font-normal text-cyan-400">({matchesWithProof.length} verified)</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
              {matchesMissingProof.length > 0 ? (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {matchesMissingProof.length} missing screenshot
                </span>
              ) : (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 100% verified with screenshots
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Total Goals */}
          <div className="bg-[#141824] border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="font-semibold">Recorded Goals</span>
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {totalGoals} <span className="text-xs font-normal text-slate-400">Goals</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              Avg <strong className="text-emerald-400 font-mono">{avgGoalsPerMatch}</strong> goals / match
            </div>
          </div>

          {/* Card 4: Action Status */}
          <div className="bg-[#141824] border border-slate-800/90 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
              <span className="font-semibold">Admin State</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-white truncate">
              {adminUser ? adminUser.email : 'Public Observer'}
            </div>
            <div className="mt-2 text-[10px]">
              {adminUser ? (
                <span className="text-emerald-400 font-medium">Score edit & reset enabled</span>
              ) : (
                <span className="text-slate-400">Login for score edit rights</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Backlog Alert Bar (Direct Bridge to Manager Log) */}
      <div
        className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
          activeBacklogSummary.hasBottlenecks
            ? activeBacklogSummary.criticalCount > 0
              ? 'bg-rose-950/25 border-rose-500/40 shadow-sm shadow-rose-950/20'
              : activeBacklogSummary.highCount > 0
              ? 'bg-orange-950/25 border-orange-500/40 shadow-sm shadow-orange-950/20'
              : 'bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-950/20'
            : 'bg-emerald-950/20 border-emerald-500/30'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                activeBacklogSummary.hasBottlenecks
                  ? activeBacklogSummary.criticalCount > 0
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {activeBacklogSummary.hasBottlenecks ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Schedule Enforcement
                </span>
                {activeBacklogSummary.hasBottlenecks ? (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-bold text-white">
                      {activeBacklogSummary.totalActivePendingMatches} active match
                      {activeBacklogSummary.totalActivePendingMatches > 1 ? 'es' : ''} holding up round progression
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Rounds {activeBacklogSummary.activeRounds.map((r) => `R${r}`).join(', ')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-bold text-emerald-300">
                      All started matchdays 100% on schedule
                    </span>
                  </>
                )}
              </div>

              {activeBacklogSummary.hasBottlenecks ? (
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                  <span>
                    <strong className="text-white font-mono">{activeBacklogSummary.laggingTeams.length}</strong>{' '}
                    club{activeBacklogSummary.laggingTeams.length > 1 ? 's' : ''} lagging behind:{' '}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeBacklogSummary.laggingTeams.slice(0, 4).map(({ team, count }) => {
                      const isCritical = count > 7;
                      const isHigh = count > 5;
                      const isModerate = count > 3;
                      return (
                        <span
                          key={team.id}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : isHigh
                              ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                              : isModerate
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <TeamLogo team={team} size="xs" />
                          <span>{team.clubName}</span>
                          <strong className="font-mono font-bold">({count})</strong>
                        </span>
                      );
                    })}
                    {activeBacklogSummary.laggingTeams.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        +{activeBacklogSummary.laggingTeams.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No active bottlenecks detected across started matchdays. Pacing is healthy.
                </p>
              )}
            </div>
          </div>

          {/* Direct Action Shortcut to Manager Log */}
          {onNavigateToManagerLog && (
            <button
              onClick={onNavigateToManagerLog}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition shadow-sm cursor-pointer ${
                activeBacklogSummary.hasBottlenecks
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/10'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Inspect in Manager Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Commissioner Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#0a0c10] border border-slate-800 rounded-xl overflow-x-auto no-scrollbar shadow-md">
        <button
          id="admin-subtab-ledger"
          onClick={() => setAdminSubTab('ledger')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
            adminSubTab === 'ledger'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Submission Ledger</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/30 text-white font-mono">
            {completedCount}
          </span>
        </button>

        <button
          id="admin-subtab-pacing"
          onClick={() => setAdminSubTab('pacing')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
            adminSubTab === 'pacing'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Round Pacing &amp; Bottlenecks</span>
        </button>

        <button
          id="admin-subtab-fairplay"
          onClick={() => setAdminSubTab('fairplay')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
            adminSubTab === 'fairplay'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Fair-Play &amp; Outliers</span>
          {pendingFlaggedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-mono">
              {pendingFlaggedCount}
            </span>
          )}
        </button>

        <button
          id="admin-subtab-reports"
          onClick={() => setAdminSubTab('reports')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
            adminSubTab === 'reports'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Reports &amp; Storage</span>
        </button>
      </div>

      {/* Tab 1: Submission Ledger */}
      {adminSubTab === 'ledger' && (
        <div className="space-y-4">
          {/* Real-Life Activity Quick Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                  Played Today
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {realLifeDateStats.todayCount}
                  </span>
                  <span className="text-[11px] text-slate-500">matches</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                  Played Yesterday
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-blue-400 font-mono">
                    {realLifeDateStats.yesterdayCount}
                  </span>
                  <span className="text-[11px] text-slate-500">matches</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Calendar className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                  Last 7 Days
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-purple-400 font-mono">
                    {realLifeDateStats.last7Count}
                  </span>
                  <span className="text-[11px] text-slate-500">matches</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                  Active Match Days
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-amber-400 font-mono">
                    {realLifeDateStats.distinctDaysCount}
                  </span>
                  <span className="text-[11px] text-slate-500">calendar days</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search club, manager, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#141824] border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Round Filter & Sort Dropdowns */}
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="hidden sm:inline">Round:</span>
                  <select
                    value={selectedRoundFilter}
                    onChange={(e) => setSelectedRoundFilter(e.target.value)}
                    className="bg-[#141824] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Rounds ({allRounds.length})</option>
                    {allRounds.map((r) => (
                      <option key={r} value={r}>
                        Round {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-[#141824] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="recent">Real-Life Time (Newest First)</option>
                    <option value="oldest">Real-Life Time (Oldest First)</option>
                    <option value="team-asc">Team Name (A-Z)</option>
                    <option value="team-desc">Team Name (Z-A)</option>
                    <option value="round-desc">Latest Round First</option>
                    <option value="round-asc">Earliest Round First</option>
                    <option value="goals-desc">Highest Scoring</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Real-Life Played Date Filter Row */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold mr-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Real-Life Date:</span>
              </div>

              <button
                onClick={() => {
                  setDateFilterMode('all');
                  setCustomDate('');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  dateFilterMode === 'all' && !customDate
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Dates ({completedCount})
              </button>

              <button
                onClick={() => {
                  setDateFilterMode('today');
                  setCustomDate('');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  dateFilterMode === 'today'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>Today ({realLifeDateStats.todayCount})</span>
              </button>

              <button
                onClick={() => {
                  setDateFilterMode('yesterday');
                  setCustomDate('');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  dateFilterMode === 'yesterday'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>Yesterday ({realLifeDateStats.yesterdayCount})</span>
              </button>

              <button
                onClick={() => {
                  setDateFilterMode('last7');
                  setCustomDate('');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  dateFilterMode === 'last7'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>Last 7 Days ({realLifeDateStats.last7Count})</span>
              </button>

              {/* Exact Date Picker */}
              <div className="flex items-center gap-1 ml-auto sm:ml-2">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    if (e.target.value) {
                      setDateFilterMode('custom');
                    } else {
                      setDateFilterMode('all');
                    }
                  }}
                  className="bg-[#141824] border border-slate-700 text-slate-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  title="Filter matches by exact real-world calendar day"
                />
                {customDate && (
                  <button
                    onClick={() => {
                      setCustomDate('');
                      setDateFilterMode('all');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-200 bg-slate-800 rounded text-xs cursor-pointer"
                    title="Clear date filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-[11px] text-slate-400 mr-1 font-semibold">Criteria:</span>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Submissions ({completedCount})
              </button>
              <button
                onClick={() => setFilterMode('with-proof')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  filterMode === 'with-proof'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Camera className="w-3 h-3 text-cyan-400" />
                <span>With Screenshot ({matchesWithProof.length})</span>
              </button>
              <button
                onClick={() => setFilterMode('missing-proof')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  filterMode === 'missing-proof'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Missing Proof ({matchesMissingProof.length})</span>
              </button>
              <button
                onClick={() => setFilterMode('high-scoring')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  filterMode === 'high-scoring'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>High Scoring (5+ Goals)</span>
              </button>
              <button
                onClick={() => setFilterMode('draws')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterMode === 'draws'
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Draws
              </button>
            </div>
          </div>

          {/* Submission Audit Ledger */}
          <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 border-b border-slate-800 bg-[#0a0c10] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Submission Audit Ledger
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({filteredSubmissions.length} of {completedCount} recorded)
                </span>
              </div>

              {/* View Layout Switcher (Timeline by Day vs Flat List) */}
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {viewLayout === 'timeline' && groupedSubmissionsByDay.length > 1 && (
                  <button
                    onClick={allDaysExpanded ? collapseAllDays : expandAllDays}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#141824] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer flex items-center gap-1.5"
                    title={allDaysExpanded ? 'Collapse all date sections' : 'Expand all date sections'}
                  >
                    <span>{allDaysExpanded ? 'Collapse All' : 'Expand All'}</span>
                  </button>
                )}

                <div className="flex items-center gap-1 bg-[#141824] p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setViewLayout('timeline')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      viewLayout === 'timeline'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Group matches by real-life calendar day"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Timeline by Day</span>
                  </button>
                  <button
                    onClick={() => setViewLayout('flat')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                      viewLayout === 'flat'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Show continuous chronological list"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Flat List</span>
                  </button>
                </div>
              </div>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No match submissions found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your date filters, round filters, or search terms.
                </p>
              </div>
            ) : viewLayout === 'timeline' ? (
              <div className="divide-y divide-slate-800/80">
                {groupedSubmissionsByDay.map((group) => {
                  const isOpen = isDayExpanded(group.dayKey);
                  return (
                    <div key={group.dayKey} className="border-b border-slate-800/80 last:border-b-0">
                      {/* Day Group Header (Collapsible) */}
                      <button
                        type="button"
                        onClick={() => toggleDayExpanded(group.dayKey)}
                        className="w-full bg-[#0b0e17] hover:bg-[#121622] px-4 py-2.5 border-y border-slate-800/90 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-10 text-left transition cursor-pointer group/day select-none"
                        title={isOpen ? 'Click to collapse this day' : 'Click to expand this day'}
                        aria-expanded={isOpen}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1 rounded bg-slate-800/70 text-slate-400 group-hover/day:text-emerald-400 group-hover/day:bg-emerald-500/10 transition-transform duration-200 ${
                              isOpen ? 'rotate-90 text-emerald-400' : ''
                            }`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold text-white tracking-wide">
                            {group.mainLabel}
                          </span>
                          {group.subLabel && (
                            <span className="text-[11px] text-slate-400 hidden sm:inline">
                              • {group.subLabel}
                            </span>
                          )}
                          {group.isToday && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Today
                            </span>
                          )}
                          {group.isYesterday && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              Yesterday
                            </span>
                          )}
                          {group.dayKey === mostRecentDayKey && !group.isToday && !group.isYesterday && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              Recent
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono ml-auto">
                          <span>
                            <strong className="text-slate-200 font-semibold">{group.matches.length}</strong>{' '}
                            {group.matches.length === 1 ? 'match' : 'matches'}
                          </span>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold">
                            {group.totalGoals} goals
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans hidden sm:inline ml-1 px-1.5 py-0.5 rounded bg-slate-800/50 group-hover/day:bg-slate-800 group-hover/day:text-slate-200 transition">
                            {isOpen ? 'Fold' : 'Expand'}
                          </span>
                        </div>
                      </button>

                      {/* Day Matches (Collapsible body) */}
                      {isOpen && (
                        <div className="divide-y divide-slate-800/70">
                          {group.matches.map((match) => {
                        const homeTeam = teamMap.get(match.homeTeamId);
                        const awayTeam = teamMap.get(match.awayTeamId);
                        const homeScore = match.homeScore ?? 0;
                        const awayScore = match.awayScore ?? 0;
                        const isHomeWinner = homeScore > awayScore;
                        const isAwayWinner = awayScore > homeScore;

                        const { dateStr, timeStr, relativeStr, dayKey } = formatMatchRealLifeDateTime(match);
                        const isTodayMatch = dayKey === getLocalDateKey(new Date());
                        const proofUrl = getProofForMatch(match);

                        return (
                          <div
                            key={match.id}
                            className="p-3 sm:p-4 hover:bg-[#141824]/60 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 group"
                          >
                            {/* Left Column: Round Badge, Real-Life Date & Time, Submitter */}
                            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-[#141824] border border-slate-800 text-center shrink-0">
                                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                                  Rnd
                                </span>
                                <span className="text-sm font-black text-emerald-400 font-mono leading-tight">
                                  {match.round}
                                </span>
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Real-Life Time & Date Display */}
                                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-200">
                                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="font-mono">{timeStr || 'Time n/a'}</span>
                                    {group.dayKey === 'unknown' && dateStr && (
                                      <span className="text-slate-400 font-normal">({dateStr})</span>
                                    )}
                                  </div>

                                  {relativeStr && relativeStr !== 'Undated' && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                        isTodayMatch
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : relativeStr === 'Yesterday'
                                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {relativeStr}
                                    </span>
                                  )}

                                  {match.submittedBy && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                      By: {match.submittedBy}
                                    </span>
                                  )}
                                </div>

                                {match.notes && (
                                  <p className="text-[11px] text-slate-400 italic truncate max-w-xs sm:max-w-md mt-0.5">
                                    "{match.notes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Middle Column: Scoreline & Match Teams */}
                            <div className="flex-1 flex items-center justify-center gap-3 sm:gap-5 w-full md:w-auto my-1 md:my-0">
                              {/* Home Team */}
                              <button
                                onClick={() => homeTeam && onSelectTeam(homeTeam)}
                                className="flex items-center gap-2 text-right justify-end flex-1 min-w-0 group/home hover:opacity-80 transition cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <div
                                    className={`text-xs sm:text-sm font-bold truncate ${
                                      isHomeWinner ? 'text-white' : 'text-slate-300'
                                    }`}
                                  >
                                    {homeTeam?.clubName || 'Home Club'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {homeTeam?.managerName || ''}
                                  </div>
                                </div>
                                {homeTeam && <TeamLogo team={homeTeam} size="sm" />}
                              </button>

                              {/* Score Box */}
                              <div className="flex items-center justify-center px-3 py-1 bg-[#181d2c] border border-slate-700/80 rounded-lg shrink-0 shadow-inner">
                                <span
                                  className={`text-sm sm:text-base font-black font-mono px-1 ${
                                    isHomeWinner ? 'text-emerald-400' : 'text-slate-200'
                                  }`}
                                >
                                  {homeScore}
                                </span>
                                <span className="text-xs font-bold text-slate-500 px-0.5">-</span>
                                <span
                                  className={`text-sm sm:text-base font-black font-mono px-1 ${
                                    isAwayWinner ? 'text-emerald-400' : 'text-slate-200'
                                  }`}
                                >
                                  {awayScore}
                                </span>
                              </div>

                              {/* Away Team */}
                              <button
                                onClick={() => awayTeam && onSelectTeam(awayTeam)}
                                className="flex items-center gap-2 text-left justify-start flex-1 min-w-0 group/away hover:opacity-80 transition cursor-pointer"
                              >
                                {awayTeam && <TeamLogo team={awayTeam} size="sm" />}
                                <div className="min-w-0">
                                  <div
                                    className={`text-xs sm:text-sm font-bold truncate ${
                                      isAwayWinner ? 'text-white' : 'text-slate-300'
                                    }`}
                                  >
                                    {awayTeam?.clubName || 'Away Club'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {awayTeam?.managerName || ''}
                                  </div>
                                </div>
                              </button>
                            </div>

                            {/* Right Column: Screenshot Proof & Admin Actions */}
                            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                              {/* Proof Status */}
                              {proofUrl ? (
                                <button
                                  onClick={() =>
                                    setPreviewScreenshotUrl({
                                      url: proofUrl,
                                      matchTitle: `${homeTeam?.clubName} vs ${awayTeam?.clubName}`,
                                      score: `${homeScore} - ${awayScore}`,
                                    })
                                  }
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50 text-[11px] font-semibold transition cursor-pointer"
                                  title="Click to view full match screenshot"
                                >
                                  <Camera className="w-3 h-3 text-cyan-400" />
                                  <span>View Proof</span>
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-950/30 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>No Proof</span>
                                </span>
                              )}

                              {/* Details Button */}
                              <button
                                onClick={() => onViewMatchDetail(match)}
                                className="p-1.5 bg-[#141824] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 rounded-lg text-xs transition cursor-pointer"
                                title="Inspect match detail"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>

                              {/* Admin Direct Edit */}
                              {adminUser && (
                                <button
                                  onClick={() => onEditMatch(match)}
                                  className="p-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-lg text-xs transition cursor-pointer"
                                  title="Edit score & details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}


                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            ) : (
              /* Flat List Layout */
              <div className="divide-y divide-slate-800/70">
                {filteredSubmissions.map((match) => {
                  const homeTeam = teamMap.get(match.homeTeamId);
                  const awayTeam = teamMap.get(match.awayTeamId);
                  const homeScore = match.homeScore ?? 0;
                  const awayScore = match.awayScore ?? 0;
                  const isHomeWinner = homeScore > awayScore;
                  const isAwayWinner = awayScore > homeScore;

                  const { dateStr, timeStr, relativeStr, dayKey } = formatMatchRealLifeDateTime(match);
                  const isTodayMatch = dayKey === getLocalDateKey(new Date());
                  const proofUrl = getProofForMatch(match);

                  return (
                    <div
                      key={match.id}
                      className="p-3 sm:p-4 hover:bg-[#141824]/60 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 group"
                    >
                      {/* Left Column: Round Badge, Real-Life Date & Time, Submitter */}
                      <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-[#141824] border border-slate-800 text-center shrink-0">
                          <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                            Rnd
                          </span>
                          <span className="text-sm font-black text-emerald-400 font-mono leading-tight">
                            {match.round}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{dateStr}</span>
                              {timeStr && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="text-slate-300 font-mono">{timeStr}</span>
                                </>
                              )}
                            </div>

                            {relativeStr && relativeStr !== 'Undated' && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  isTodayMatch
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : relativeStr === 'Yesterday'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {relativeStr}
                              </span>
                            )}

                            {match.submittedBy && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                By: {match.submittedBy}
                              </span>
                            )}
                          </div>

                          {match.notes && (
                            <p className="text-[11px] text-slate-400 italic truncate max-w-xs sm:max-w-md mt-0.5">
                              "{match.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Middle Column: Scoreline & Match Teams */}
                      <div className="flex-1 flex items-center justify-center gap-3 sm:gap-5 w-full md:w-auto my-1 md:my-0">
                        {/* Home Team */}
                        <button
                          onClick={() => homeTeam && onSelectTeam(homeTeam)}
                          className="flex items-center gap-2 text-right justify-end flex-1 min-w-0 group/home hover:opacity-80 transition cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isHomeWinner ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {homeTeam?.clubName || 'Home Club'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {homeTeam?.managerName || ''}
                            </div>
                          </div>
                          {homeTeam && <TeamLogo team={homeTeam} size="sm" />}
                        </button>

                        {/* Score Box */}
                        <div className="flex items-center justify-center px-3 py-1 bg-[#181d2c] border border-slate-700/80 rounded-lg shrink-0 shadow-inner">
                          <span
                            className={`text-sm sm:text-base font-black font-mono px-1 ${
                              isHomeWinner ? 'text-emerald-400' : 'text-slate-200'
                            }`}
                          >
                            {homeScore}
                          </span>
                          <span className="text-xs font-bold text-slate-500 px-0.5">-</span>
                          <span
                            className={`text-sm sm:text-base font-black font-mono px-1 ${
                              isAwayWinner ? 'text-emerald-400' : 'text-slate-200'
                            }`}
                          >
                            {awayScore}
                          </span>
                        </div>

                        {/* Away Team */}
                        <button
                          onClick={() => awayTeam && onSelectTeam(awayTeam)}
                          className="flex items-center gap-2 text-left justify-start flex-1 min-w-0 group/away hover:opacity-80 transition cursor-pointer"
                        >
                          {awayTeam && <TeamLogo team={awayTeam} size="sm" />}
                          <div className="min-w-0">
                            <div
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isAwayWinner ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {awayTeam?.clubName || 'Away Club'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {awayTeam?.managerName || ''}
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Right Column: Screenshot Proof & Admin Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                        {/* Proof Status */}
                        {proofUrl ? (
                          <button
                            onClick={() =>
                              setPreviewScreenshotUrl({
                                url: proofUrl,
                                matchTitle: `${homeTeam?.clubName} vs ${awayTeam?.clubName}`,
                                score: `${homeScore} - ${awayScore}`,
                              })
                            }
                            className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50 text-[11px] font-semibold transition cursor-pointer"
                            title="Click to view full match screenshot"
                          >
                            <Camera className="w-3 h-3 text-cyan-400" />
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-950/30 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>No Proof</span>
                          </span>
                        )}

                        {/* Details Button */}
                        <button
                          onClick={() => onViewMatchDetail(match)}
                          className="p-1.5 bg-[#141824] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 rounded-lg text-xs transition cursor-pointer"
                          title="Inspect match detail"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Admin Direct Edit */}
                        {adminUser && (
                          <button
                            onClick={() => onEditMatch(match)}
                            className="p-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-lg text-xs transition cursor-pointer"
                            title="Edit score & details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
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

      {/* Tab 2: Round Pacing & Bottlenecks */}
      {adminSubTab === 'pacing' && (
        <AdminPacingTab
          matches={matches}
          teams={teams}
          config={config}
          onViewMatchDetail={onViewMatchDetail}
          onSelectTeam={onSelectTeam}
          onNavigateToManagerLog={onNavigateToManagerLog}
        />
      )}

      {/* Tab 3: Fair-Play & Outliers */}
      {adminSubTab === 'fairplay' && (
        <AdminFairPlayTab
          matches={matches}
          teams={teams}
          config={config}
          getProofForMatch={getProofForMatch}
          onViewMatchDetail={onViewMatchDetail}
          onPreviewProof={(url, title, score) =>
            setPreviewScreenshotUrl({ url, matchTitle: title, score })
          }
          onEditMatch={onEditMatch}
          onApproveMatch={onApproveMatch}
          onRevokeApproval={onRevokeApproval}
          onBatchApproveMatches={onBatchApproveMatches}
          adminUser={adminUser}
        />
      )}

      {/* Tab 5: Storage Health & Commissioner Reports */}
      {adminSubTab === 'reports' && (
        <AdminReportsTab
          matches={matches}
          teams={teams}
          config={config}
          proofsMap={proofsMap}
          getProofForMatch={getProofForMatch}
        />
      )}

      {/* Screenshot Lightbox Modal */}
      {previewScreenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewScreenshotUrl(null)}
        >
          <div
            className="bg-[#0f1219] border border-slate-700 rounded-xl max-w-2xl w-full p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">
                  {previewScreenshotUrl.matchTitle} ({previewScreenshotUrl.score})
                </h4>
              </div>
              <button
                onClick={() => setPreviewScreenshotUrl(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-black/60 rounded-lg overflow-hidden flex items-center justify-center max-h-[70vh]">
              <img
                src={previewScreenshotUrl.url}
                alt="Match result screenshot proof"
                referrerPolicy="no-referrer"
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Attached result screenshot verification proof</span>
              <a
                href={previewScreenshotUrl.url}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>Open original</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
