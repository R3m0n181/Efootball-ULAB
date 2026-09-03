import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Scale,
  Eye,
  Shield,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  RotateCcw,
  MessageSquare,
  X,
  FileCheck,
  AlertCircle,
  Edit3,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Match, Team, TournamentConfig } from '../../types';
import { AdminUser } from '../../utils/auth';
import { TeamLogo } from '../TeamLogo';

interface AdminFairPlayTabProps {
  matches: Match[];
  teams: Team[];
  config: TournamentConfig;
  getProofForMatch: (match: Match) => string | null;
  onViewMatchDetail?: (match: Match) => void;
  onPreviewProof?: (url: string, title: string, score: string) => void;
  onEditMatch?: (match: Match) => void;
  onApproveMatch?: (matchId: string, notes?: string) => Promise<void> | void;
  onRevokeApproval?: (matchId: string) => Promise<void> | void;
  onBatchApproveMatches?: (matchIds: string[]) => Promise<void> | void;
  adminUser?: AdminUser | null;
}

export const AdminFairPlayTab: React.FC<AdminFairPlayTabProps> = ({
  matches,
  teams,
  config,
  getProofForMatch,
  onViewMatchDetail,
  onPreviewProof,
  onEditMatch,
  onApproveMatch,
  onRevokeApproval,
  onBatchApproveMatches,
  adminUser,
}) => {
  const [copiedReport, setCopiedReport] = useState(false);
  const [activeSubFilter, setActiveSubFilter] = useState<
    'pending' | 'approved' | 'all' | 'unverified' | 'blowouts' | 'high-scoring'
  >('pending');

  // Modal states for approving match
  const [approvingMatchItem, setApprovingMatchItem] = useState<{
    match: Match;
    reason: string;
    proofUrl: string | null;
  } | null>(null);
  const [approvalNoteInput, setApprovalNoteInput] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Modal state for batch approving
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [justBatchApproved, setJustBatchApproved] = useState(false);

  // Revoke confirmation modal state
  const [revokingMatch, setRevokingMatch] = useState<Match | null>(null);
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const completedMatches = useMemo(() => {
    return matches.filter(
      (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
    );
  }, [matches]);

  // Outlier detection:
  // 1. Blowouts: goal difference >= 4
  // 2. High-scoring: total goals >= 6
  // 3. Unverified high-stake: (blowout OR high-scoring) AND no proof screenshot
  const anomalies = useMemo(() => {
    const blowouts: { match: Match; diff: number; proofUrl: string | null }[] = [];
    const highScoring: { match: Match; totalGoals: number; proofUrl: string | null }[] = [];
    const unverifiedAnomalies: { match: Match; reason: string }[] = [];

    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    let cleanSheets = 0;
    let totalGoals = 0;

    completedMatches.forEach((m) => {
      const h = m.homeScore || 0;
      const a = m.awayScore || 0;
      const diff = Math.abs(h - a);
      const sum = h + a;
      const proofUrl = getProofForMatch(m);

      totalGoals += sum;

      if (h > a) homeWins++;
      else if (a > h) awayWins++;
      else draws++;

      if (h === 0 || a === 0) cleanSheets++;

      const isBlowout = diff >= 4;
      const isHighScoring = sum >= 6;

      if (isBlowout) {
        blowouts.push({ match: m, diff, proofUrl });
      }

      if (isHighScoring) {
        highScoring.push({ match: m, totalGoals: sum, proofUrl });
      }

      if ((isBlowout || isHighScoring) && !proofUrl) {
        unverifiedAnomalies.push({
          match: m,
          reason: isBlowout && isHighScoring ? 'Blowout & 6+ Goals' : isBlowout ? 'Margin >= 4 Goals' : '6+ Goals',
        });
      }
    });

    // Sort blowouts by margin descending
    blowouts.sort((a, b) => b.diff - a.diff);
    // Sort high scoring by total goals descending
    highScoring.sort((a, b) => b.totalGoals - a.totalGoals);

    return {
      blowouts,
      highScoring,
      unverifiedAnomalies,
      homeWins,
      awayWins,
      draws,
      cleanSheets,
      totalGoals,
    };
  }, [completedMatches, getProofForMatch]);

  // Master unique map of all flagged outlier matches
  const allFlaggedMap = useMemo(() => {
    const map = new Map<string, { match: Match; reason: string; proofUrl: string | null }>();

    anomalies.unverifiedAnomalies.forEach(({ match, reason }) => {
      map.set(match.id, { match, reason: `⚠️ ${reason} (No Proof)`, proofUrl: null });
    });
    anomalies.blowouts.forEach(({ match, diff, proofUrl }) => {
      if (!map.has(match.id)) {
        map.set(match.id, { match, reason: `Blowout (+${diff})`, proofUrl });
      }
    });
    anomalies.highScoring.forEach(({ match, totalGoals, proofUrl }) => {
      if (!map.has(match.id)) {
        map.set(match.id, { match, reason: `${totalGoals} Goals`, proofUrl });
      }
    });

    return map;
  }, [anomalies]);

  const allFlaggedItems = useMemo(() => {
    return Array.from(allFlaggedMap.values());
  }, [allFlaggedMap]);

  // Segregate into pending vs approved
  const pendingApprovalItems = useMemo(() => {
    return allFlaggedItems.filter(({ match }) => !match.auditApproved);
  }, [allFlaggedItems]);

  const approvedItems = useMemo(() => {
    return allFlaggedItems.filter(({ match }) => !!match.auditApproved);
  }, [allFlaggedItems]);

  // Filtered anomalies list for display based on activeSubFilter
  const displayedItems = useMemo(() => {
    if (activeSubFilter === 'pending') {
      return pendingApprovalItems;
    }
    if (activeSubFilter === 'approved') {
      return approvedItems;
    }
    if (activeSubFilter === 'unverified') {
      const map = new Map<string, { match: Match; reason: string; proofUrl: string | null }>();
      anomalies.unverifiedAnomalies.forEach(({ match, reason }) => {
        map.set(match.id, { match, reason, proofUrl: null });
      });
      return Array.from(map.values());
    }
    if (activeSubFilter === 'blowouts') {
      const map = new Map<string, { match: Match; reason: string; proofUrl: string | null }>();
      anomalies.blowouts.forEach(({ match, diff, proofUrl }) => {
        map.set(match.id, { match, reason: `Margin: ${diff} Goals`, proofUrl });
      });
      return Array.from(map.values());
    }
    if (activeSubFilter === 'high-scoring') {
      const map = new Map<string, { match: Match; reason: string; proofUrl: string | null }>();
      anomalies.highScoring.forEach(({ match, totalGoals, proofUrl }) => {
        map.set(match.id, { match, reason: `Total: ${totalGoals} Goals`, proofUrl });
      });
      return Array.from(map.values());
    }

    // Default 'all'
    return allFlaggedItems;
  }, [activeSubFilter, pendingApprovalItems, approvedItems, anomalies, allFlaggedItems]);

  const copyFairPlayReport = () => {
    const lines = [
      `🛡️ *${config.name} — Fair-Play & Anomaly Audit Report* 🛡️`,
      `Total Completed Matches: ${completedMatches.length}`,
      `Total Flagged Outliers: ${allFlaggedItems.length}`,
      `• Awaiting Admin Approval: ${pendingApprovalItems.length}`,
      `• Commissioner Approved: ${approvedItems.length}`,
      `Blowout Results (Margin ≥ 4): ${anomalies.blowouts.length}`,
      `High Scoring Results (Goals ≥ 6): ${anomalies.highScoring.length}`,
      `Critical Unverified Outliers (No Screenshot Proof): ${anomalies.unverifiedAnomalies.length}`,
      '',
      '*Pending Anomaly Audits:*',
      ...(pendingApprovalItems.length > 0
        ? pendingApprovalItems.map(({ match, reason, proofUrl }) => {
            const home = teamMap.get(match.homeTeamId);
            const away = teamMap.get(match.awayTeamId);
            return `• Round ${match.round}: ${home?.clubName} ${match.homeScore}-${match.awayScore} ${away?.clubName} [${reason}] ${
              proofUrl ? '📷 Proof Attached' : '⚠️ NO PROOF'
            }`;
          })
        : ['✅ All flagged outlier matches have been reviewed and approved.']),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleOpenApproveDialog = (item: { match: Match; reason: string; proofUrl: string | null }) => {
    setApprovingMatchItem(item);
    setApprovalNoteInput(item.match.approvalNotes || '');
  };

  const handleConfirmSingleApprove = async () => {
    if (!approvingMatchItem || !onApproveMatch) return;
    setIsSubmittingApproval(true);
    try {
      await onApproveMatch(approvingMatchItem.match.id, approvalNoteInput.trim() || undefined);
      setApprovingMatchItem(null);
      setApprovalNoteInput('');
    } catch (err) {
      console.error('Failed to approve match:', err);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleConfirmBatchApprove = async () => {
    if (pendingApprovalItems.length === 0 || !onBatchApproveMatches) return;
    setIsSubmittingBatch(true);
    try {
      const matchIds = pendingApprovalItems.map((item) => item.match.id);
      await onBatchApproveMatches(matchIds);
      setIsBatchModalOpen(false);
      setJustBatchApproved(true);
      setTimeout(() => setJustBatchApproved(false), 3500);
    } catch (err) {
      console.error('Failed to batch approve matches:', err);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokingMatch || !onRevokeApproval) return;
    setIsSubmittingRevoke(true);
    try {
      await onRevokeApproval(revokingMatch.id);
      setRevokingMatch(null);
    } catch (err) {
      console.error('Failed to revoke match approval:', err);
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 4 Fair Play Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Awaiting Approval */}
        <div
          onClick={() => setActiveSubFilter('pending')}
          className={`border rounded-xl p-3.5 transition cursor-pointer ${
            activeSubFilter === 'pending'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
              : 'bg-[#141824] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Awaiting Approval</span>
            <Clock className={`w-3.5 h-3.5 ${pendingApprovalItems.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-black font-mono ${pendingApprovalItems.length > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {pendingApprovalItems.length}
            </span>
            <span className="text-[11px] text-slate-400">
              / {allFlaggedItems.length} flagged
            </span>
          </div>
          <div className="text-[11px] mt-1">
            {pendingApprovalItems.length > 0 ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 inline" /> Requires Admin Review
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 inline" /> All Flagged Approved
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Critical Unverified */}
        <div
          onClick={() => setActiveSubFilter('unverified')}
          className={`border rounded-xl p-3.5 transition cursor-pointer ${
            activeSubFilter === 'unverified'
              ? 'bg-rose-500/10 border-rose-500/50 shadow-md'
              : 'bg-[#141824] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Critical Unverified</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">
            {anomalies.unverifiedAnomalies.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {anomalies.unverifiedAnomalies.length > 0 ? (
              <span className="text-rose-400 font-semibold">Missing SS proof</span>
            ) : (
              <span className="text-emerald-400">All outliers have SS proof</span>
            )}
          </div>
        </div>

        {/* Card 3: Blowout Matches */}
        <div
          onClick={() => setActiveSubFilter('blowouts')}
          className={`border rounded-xl p-3.5 transition cursor-pointer ${
            activeSubFilter === 'blowouts'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
              : 'bg-[#141824] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Blowout Matches</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">
            {anomalies.blowouts.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Margin ≥ 4 goals difference</div>
        </div>

        {/* Card 4: High-Scoring Thrillers */}
        <div
          onClick={() => setActiveSubFilter('high-scoring')}
          className={`border rounded-xl p-3.5 transition cursor-pointer ${
            activeSubFilter === 'high-scoring'
              ? 'bg-purple-500/10 border-purple-500/50 shadow-md'
              : 'bg-[#141824] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>High-Scoring Thrillers</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">
            {anomalies.highScoring.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">6+ combined goals scored</div>
        </div>
      </div>

      {/* Admin Action Notification Banner if pending approval */}
      {pendingApprovalItems.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-[#0f1219] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200 flex items-center gap-1.5 flex-wrap">
                <span>Commissioner Verification Required</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200 font-mono">
                  {pendingApprovalItems.length} match{pendingApprovalItems.length > 1 ? 'es' : ''} awaiting approval
                </span>
              </h4>
              <p className="text-xs text-amber-300/80 mt-1">
                Outlier scores (blowout margins ≥ 4 goals or 6+ total goals) require admin review. Inspect the
                match details and screenshot proofs before approving.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
            {onBatchApproveMatches && pendingApprovalItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  id="batch-approve-pending-btn"
                  onClick={handleConfirmBatchApprove}
                  disabled={isSubmittingBatch}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  title="Approve all pending flagged matches with 1 click"
                >
                  {isSubmittingBatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Approving All ({pendingApprovalItems.length})...</span>
                    </>
                  ) : justBatchApproved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>All Approved!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve All Pending ({pendingApprovalItems.length})</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  disabled={isSubmittingBatch}
                  className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition cursor-pointer"
                  title="Inspect list of matches before approving"
                >
                  Review
                </button>
              </div>
            )}

            <button
              onClick={copyFairPlayReport}
              className="px-3 py-1.5 bg-[#141824] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReport ? 'Copied!' : 'Audit Report'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Anomaly Score & Approval Ledger */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 py-3.5 border-b border-slate-800 bg-[#0a0c10] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Outlier &amp; Anomaly Score Ledger
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              ({displayedItems.length} showing)
            </span>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
            <button
              onClick={() => setActiveSubFilter('pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pending Review ({pendingApprovalItems.length})</span>
            </button>

            {onBatchApproveMatches && pendingApprovalItems.length > 0 && activeSubFilter === 'pending' && (
              <button
                onClick={handleConfirmBatchApprove}
                disabled={isSubmittingBatch}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm cursor-pointer ml-auto"
                title="Approve all pending matches now"
              >
                {isSubmittingBatch ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                <span>Approve All ({pendingApprovalItems.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveSubFilter('approved')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubFilter === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Approved ({approvedItems.length})</span>
            </button>

            <button
              onClick={() => setActiveSubFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSubFilter === 'all'
                  ? 'bg-slate-700 text-white border border-slate-600 shadow-sm'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              All Flagged ({allFlaggedItems.length})
            </button>

            <button
              onClick={() => setActiveSubFilter('unverified')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSubFilter === 'unverified'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              Missing Proof ({anomalies.unverifiedAnomalies.length})
            </button>

            <button
              onClick={() => setActiveSubFilter('blowouts')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSubFilter === 'blowouts'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              Blowouts ({anomalies.blowouts.length})
            </button>

            <button
              onClick={() => setActiveSubFilter('high-scoring')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSubFilter === 'high-scoring'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'bg-[#141824] text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              6+ Goals ({anomalies.highScoring.length})
            </button>
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-white">
              {activeSubFilter === 'pending'
                ? 'All Flagged Matches Are Approved'
                : activeSubFilter === 'approved'
                ? 'No Approved Outliers in Current View'
                : 'No Flagged Anomalies'}
            </div>
            <div className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {activeSubFilter === 'pending'
                ? 'There are currently no outlier matches awaiting administrator approval. Great job keeping the league certified!'
                : 'All matches meet fair-play standards.'}
            </div>
            {activeSubFilter === 'pending' && approvedItems.length > 0 && (
              <button
                onClick={() => setActiveSubFilter('approved')}
                className="mt-3 px-3 py-1.5 bg-[#141824] hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                View Approved Matches ({approvedItems.length})
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {displayedItems.map(({ match, reason, proofUrl }) => {
              const home = teamMap.get(match.homeTeamId);
              const away = teamMap.get(match.awayTeamId);
              const hasProof = !!proofUrl;
              const isApproved = !!match.auditApproved;

              return (
                <div
                  key={match.id}
                  className={`p-3.5 sm:p-4 transition flex flex-col gap-3 ${
                    !isApproved ? 'bg-amber-950/10 hover:bg-amber-950/20' : 'hover:bg-slate-900/40'
                  }`}
                >
                  {/* Top Status & Reason Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-[#141824] text-slate-300 text-xs font-bold font-mono border border-slate-700/60">
                        MD {match.round}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {reason}
                      </span>

                      {/* Approval Status Badge */}
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/35">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Approved by @{match.approvedBy || 'Commissioner'}</span>
                          {match.approvedAt && (
                            <span className="text-[10px] text-emerald-300/70 font-mono ml-0.5">
                              • {new Date(match.approvedAt).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Awaiting Admin Approval</span>
                        </span>
                      )}
                    </div>

                    {/* Proof badge */}
                    <div>
                      {hasProof ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/25">
                          <Camera className="w-3 h-3" />
                          <span>Proof Attached</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
                          <AlertTriangle className="w-3 h-3" />
                          <span>No Screenshot</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Matchup Center (Responsive 3-Column / Flex Layout) */}
                  <div className="flex items-center justify-between gap-2 min-w-0 bg-[#0d1017] p-2.5 sm:p-3 rounded-xl border border-slate-800/80">
                    {/* Home Team */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <TeamLogo team={home} size="xs" />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-200 block truncate">
                          {home?.clubName || 'Home'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          @{home?.managerName || 'TBD'}
                        </span>
                      </div>
                    </div>

                    {/* Score Box */}
                    <div className="shrink-0 px-3.5 py-1.5 rounded-lg font-mono font-black text-sm text-center min-w-[64px] bg-[#141824] border border-slate-700/70 text-white shadow-inner">
                      {match.homeScore} - {match.awayScore}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-200 block truncate">
                          {away?.clubName || 'Away'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          @{away?.managerName || 'TBD'}
                        </span>
                      </div>
                      <TeamLogo team={away} size="xs" />
                    </div>
                  </div>

                  {/* Optional Commissioner Note display */}
                  {match.approvalNotes && (
                    <div className="px-3 py-1.5 rounded-lg bg-[#0a0c10] border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-400">Commissioner Note:</span>{' '}
                        <span className="italic text-slate-200">"{match.approvalNotes}"</span>
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasProof && (
                        <button
                          onClick={() =>
                            onPreviewProof?.(
                              proofUrl,
                              `${home?.clubName} vs ${away?.clubName}`,
                              `${match.homeScore} - ${match.awayScore}`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Inspect Screenshot</span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewMatchDetail?.(match)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Match Details</span>
                      </button>

                      {onEditMatch && (
                        <button
                          onClick={() => onEditMatch(match)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition flex items-center gap-1 cursor-pointer"
                          title="Edit match score"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {/* Approval / Revoke Button */}
                    <div className="flex items-center gap-2">
                      {!isApproved ? (
                        <button
                          id={`approve-match-btn-${match.id}`}
                          onClick={() => handleOpenApproveDialog({ match, reason, proofUrl })}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Approve Result</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setRevokingMatch(match)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 flex items-center gap-1 transition cursor-pointer"
                          title="Revoke approval"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Revoke Approval</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SINGLE MATCH APPROVAL MODAL */}
      {approvingMatchItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141824] border border-emerald-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Commissioner Audit Approval</h3>
                  <p className="text-xs text-slate-400">Certify flagged outlier match as verified</p>
                </div>
              </div>
              <button
                onClick={() => setApprovingMatchItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Match Summary Box */}
            <div className="bg-[#0d1017] p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-emerald-400">
                  Matchday {approvingMatchItem.match.round}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {approvingMatchItem.reason}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <TeamLogo team={teamMap.get(approvingMatchItem.match.homeTeamId)} size="xs" />
                  <span className="text-xs font-bold text-white truncate">
                    {teamMap.get(approvingMatchItem.match.homeTeamId)?.clubName}
                  </span>
                </div>

                <div className="px-3 py-1 rounded bg-[#141824] border border-slate-700 font-mono font-black text-white text-sm">
                  {approvingMatchItem.match.homeScore} - {approvingMatchItem.match.awayScore}
                </div>

                <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                  <span className="text-xs font-bold text-white truncate">
                    {teamMap.get(approvingMatchItem.match.awayTeamId)?.clubName}
                  </span>
                  <TeamLogo team={teamMap.get(approvingMatchItem.match.awayTeamId)} size="xs" />
                </div>
              </div>

              {/* Proof status notice inside modal */}
              {approvingMatchItem.proofUrl ? (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Screenshot proof is attached
                  </span>
                  <button
                    onClick={() =>
                      onPreviewProof?.(
                        approvingMatchItem.proofUrl!,
                        'Proof Inspection',
                        `${approvingMatchItem.match.homeScore} - ${approvingMatchItem.match.awayScore}`
                      )
                    }
                    className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Camera className="w-3 h-3" /> Inspect Proof
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-rose-300 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    No screenshot proof attached
                  </span>
                  <p className="text-[10px] text-rose-300/80 mt-0.5">
                    Please make sure you have independently confirmed this result with both managers before certifying.
                  </p>
                </div>
              )}
            </div>

            {/* Optional Commissioner Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Approval Note (Optional)</span>
                <span className="text-[10px] text-slate-500 font-normal">Visible in match audit record</span>
              </label>

              {/* Quick suggestion chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  'Verified with both managers',
                  'Legitimate score confirmed',
                  'Screenshot proof verified',
                  'Competitive fair play',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setApprovalNoteInput(chip)}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer border border-slate-700/60"
                  >
                    +{chip}
                  </button>
                ))}
              </div>

              <textarea
                value={approvalNoteInput}
                onChange={(e) => setApprovalNoteInput(e.target.value)}
                placeholder="e.g. Confirmed by both managers in WhatsApp group..."
                rows={2}
                className="w-full bg-[#0a0c10] border border-slate-700/80 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setApprovingMatchItem(null)}
                disabled={isSubmittingApproval}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleApprove}
                disabled={isSubmittingApproval}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmittingApproval ? 'Approving...' : 'Confirm & Approve Result'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH APPROVE CONFIRMATION MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141824] border border-emerald-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Batch Approve Flagged Matches</h3>
                  <p className="text-xs text-slate-400">
                    Approve all {pendingApprovalItems.length} pending outlier results
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                You are about to certify <strong className="text-white">{pendingApprovalItems.length}</strong> flagged outlier
                match result{pendingApprovalItems.length > 1 ? 's' : ''} as officially approved by{' '}
                <strong className="text-emerald-400">@{adminUser?.name || 'Commissioner'}</strong>.
              </p>

              {/* Scrollable List of matches being batch approved */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar rounded-xl bg-[#0a0c10] p-2.5 border border-slate-800">
                {pendingApprovalItems.map(({ match, reason, proofUrl }) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  return (
                    <div
                      key={match.id}
                      className="flex items-center justify-between text-[11px] p-1.5 rounded bg-[#141824]/60 border border-slate-800/60"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono font-bold text-emerald-400">R{match.round}</span>
                        <span className="text-slate-200 truncate font-semibold">
                          {home?.shortCode} {match.homeScore}-{match.awayScore} {away?.shortCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-amber-300 font-mono">{reason}</span>
                        {proofUrl ? (
                          <span className="text-[10px] text-cyan-400">📷 Proof</span>
                        ) : (
                          <span className="text-[10px] text-rose-400">⚠️ No Proof</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                disabled={isSubmittingBatch}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchApprove}
                disabled={isSubmittingBatch}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingBatch ? 'Approving All...' : `Confirm & Approve All (${pendingApprovalItems.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE CONFIRMATION MODAL */}
      {revokingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141824] border border-rose-500/40 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Revoke Approval</h3>
                  <p className="text-xs text-slate-400">Return match to pending audit status</p>
                </div>
              </div>
              <button
                onClick={() => setRevokingMatch(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to revoke commissioner approval for{' '}
              <strong className="text-white">
                Matchday {revokingMatch.round}: {teamMap.get(revokingMatch.homeTeamId)?.clubName} vs{' '}
                {teamMap.get(revokingMatch.awayTeamId)?.clubName} ({revokingMatch.homeScore} - {revokingMatch.awayScore})
              </strong>
              ? This match will return to the "Awaiting Approval" list.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRevokingMatch(null)}
                disabled={isSubmittingRevoke}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isSubmittingRevoke}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isSubmittingRevoke ? 'Revoking...' : 'Confirm Revocation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
