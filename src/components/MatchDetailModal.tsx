import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Camera,
  Share2,
  Edit3,
  Upload,
  Maximize2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Award,
  Loader2,
} from 'lucide-react';
import { Match, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { compressScreenshot } from '../utils/imageCompressor';
import { fetchMatchProof, subscribeToMatchProof, saveMatchProof } from '../lib/matchProofs';

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  teams: Team[];
  onEditMatch: (match: Match) => void;
  onShareMatch: (match: Match) => void;
  onSelectTeam: (team: Team) => void;
  onUpdateScreenshot?: (matchId: string, screenshotUrl?: string) => void;
  isAdmin?: boolean;
  parentTeamContext?: Team | null;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  isOpen,
  onClose,
  match,
  teams,
  onEditMatch,
  onShareMatch,
  onSelectTeam,
  onUpdateScreenshot,
  isAdmin = false,
  parentTeamContext = null,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeProofUrl, setActiveProofUrl] = useState<string | null>(null);
  const [isLoadingProof, setIsLoadingProof] = useState(false);

  // Load / subscribe to match proof from dedicated match_proofs collection on-demand
  useEffect(() => {
    if (!isOpen || !match) {
      setActiveProofUrl(null);
      return;
    }

    // Direct match object fallback if present
    if (match.screenshotUrl) {
      setActiveProofUrl(match.screenshotUrl);
    } else {
      setIsLoadingProof(true);
      fetchMatchProof(match.id).then((url) => {
        setActiveProofUrl(url);
        setIsLoadingProof(false);
      });
    }

    // Real-time listener for this specific match's proof
    const unsubscribe = subscribeToMatchProof(match.id, (url) => {
      setActiveProofUrl(url);
      setIsLoadingProof(false);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, match?.id]);

  if (!isOpen || !match) return null;

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const homeTeam = teamMap.get(match.homeTeamId);
  const awayTeam = teamMap.get(match.awayTeamId);

  if (!homeTeam || !awayTeam) return null;

  const isCompleted =
    match.status === 'completed' &&
    match.homeScore !== null &&
    match.awayScore !== null;

  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const homeWon = isCompleted && homeScore > awayScore;
  const awayWon = isCompleted && awayScore > homeScore;
  const isDraw = isCompleted && homeScore === awayScore;

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateScreenshot) {
      setIsUploading(true);
      try {
        const compressed = await compressScreenshot(file);
        setActiveProofUrl(compressed);
        onUpdateScreenshot(match.id, compressed);
      } catch (err) {
        console.error('Failed to compress screenshot, using fallback:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          setActiveProofUrl(res);
          onUpdateScreenshot(match.id, res);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveScreenshot = () => {
    if (onUpdateScreenshot) {
      setActiveProofUrl(null);
      onUpdateScreenshot(match.id, undefined);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-[#0f1219] border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-2xl w-full max-w-xl shadow-2xl shadow-black/80 overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-800/90 bg-[#141824]/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-white truncate">Match Result</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-300">
                    MD {match.round} • #{match.matchNumber}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">Official eFootball Match Record</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {parentTeamContext && (
                <button
                  onClick={onClose}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 text-[10px] font-semibold transition cursor-pointer"
                  title={`Back to ${parentTeamContext.clubName}`}
                >
                  <span>← Back</span>
                </button>
              )}
              <button
                onClick={() => onShareMatch(match)}
                title="Share Result Card"
                aria-label="Share Result Card"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                aria-label="Close match details"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
            {/* Main Match Scorecard */}
            <div className="relative rounded-xl bg-gradient-to-b from-[#141824] to-[#0a0c10] border border-slate-800 p-4 sm:p-5 overflow-hidden shadow-inner">
              {/* Subtle team color background gradients */}
              <div
                className="absolute top-0 left-0 w-1/2 h-full opacity-10 blur-2xl pointer-events-none"
                style={{ backgroundColor: homeTeam.color }}
              />
              <div
                className="absolute top-0 right-0 w-1/2 h-full opacity-10 blur-2xl pointer-events-none"
                style={{ backgroundColor: awayTeam.color }}
              />

              {/* Status Pill */}
              <div className="flex justify-center mb-3">
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Full Time Result
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium text-slate-400 bg-slate-900 border border-slate-800">
                    <Clock className="w-3.5 h-3.5" />
                    Scheduled Match
                  </span>
                )}
              </div>

              {/* Teams & Scoreboard */}
              <div className="grid grid-cols-5 items-center gap-2">
                {/* Home Team */}
                <div
                  onClick={() => onSelectTeam(homeTeam)}
                  className="col-span-2 flex flex-col items-center text-center cursor-pointer group"
                >
                  <div className="relative">
                    <TeamLogo team={homeTeam} size="lg" className="mb-2 transition group-hover:scale-105" />
                    {homeWon && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-[10px] shadow">
                        🏆
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition truncate max-w-full">
                    {homeTeam.clubName}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-full mt-0.5">
                    {homeTeam.managerName}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.2 rounded mt-1.5 uppercase font-semibold">
                    HOME
                  </span>
                </div>

                {/* Scoreboard Center */}
                <div className="col-span-1 flex flex-col items-center justify-center">
                  {isCompleted ? (
                    <div className="flex items-center gap-1.5 bg-[#08090d] px-3.5 py-2 rounded-xl border border-slate-700 shadow-md">
                      <span
                        className={`text-2xl sm:text-3xl font-black font-mono ${
                          homeWon ? 'text-emerald-400' : 'text-slate-200'
                        }`}
                      >
                        {match.homeScore}
                      </span>
                      <span className="text-slate-500 font-black text-xl">:</span>
                      <span
                        className={`text-2xl sm:text-3xl font-black font-mono ${
                          awayWon ? 'text-emerald-400' : 'text-slate-200'
                        }`}
                      >
                        {match.awayScore}
                      </span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-500 font-mono">
                      VS
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 font-mono mt-2">
                    {isCompleted && match.playedAt
                      ? new Date(match.playedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Not played yet'}
                  </span>
                </div>

                {/* Away Team */}
                <div
                  onClick={() => onSelectTeam(awayTeam)}
                  className="col-span-2 flex flex-col items-center text-center cursor-pointer group"
                >
                  <div className="relative">
                    <TeamLogo team={awayTeam} size="lg" className="mb-2 transition group-hover:scale-105" />
                    {awayWon && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-[10px] shadow">
                        🏆
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition truncate max-w-full">
                    {awayTeam.clubName}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-full mt-0.5">
                    {awayTeam.managerName}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700 px-1.5 py-0.2 rounded mt-1.5 uppercase font-semibold">
                    AWAY
                  </span>
                </div>
              </div>

              {/* Match Outcome Summary Banner */}
              {isCompleted && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
                  <p className="text-xs font-semibold text-slate-200">
                    {homeWon && (
                      <span className="text-emerald-400">
                        {homeTeam.clubName} ({homeTeam.managerName}) won by{' '}
                        {homeScore - awayScore} {homeScore - awayScore === 1 ? 'goal' : 'goals'}
                      </span>
                    )}
                    {awayWon && (
                      <span className="text-emerald-400">
                        {awayTeam.clubName} ({awayTeam.managerName}) won by{' '}
                        {awayScore - homeScore} {awayScore - homeScore === 1 ? 'goal' : 'goals'}
                      </span>
                    )}
                    {isDraw && (
                      <span className="text-amber-300">
                        Match finished in a {homeScore}-{awayScore} Draw (1 Point each)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Match Screenshot / Proof Section (SS of the Match) */}
            <div className="rounded-xl bg-[#0a0c10] border border-slate-800 p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      Match Screenshot Proof (SS)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      eFootball match result screenshot &amp; post-game stats
                    </p>
                  </div>
                </div>

                {activeProofUrl && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsLightboxOpen(true)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Full View</span>
                    </button>
                    {isAdmin && onUpdateScreenshot && (
                      <button
                        onClick={handleRemoveScreenshot}
                        title="Remove Screenshot"
                        className="p-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isLoadingProof ? (
                <div className="p-6 rounded-xl border border-slate-800 bg-[#0f1219]/60 text-center flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <p className="text-xs text-slate-400">Loading match screenshot proof...</p>
                </div>
              ) : activeProofUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-700/80 bg-black max-h-80 flex items-center justify-center">
                  <img
                    src={activeProofUrl}
                    alt={`Match Result SS: ${homeTeam.clubName} vs ${awayTeam.clubName}`}
                    className="w-full h-auto max-h-80 object-contain rounded-lg cursor-pointer hover:opacity-95 transition"
                    onClick={() => setIsLightboxOpen(true)}
                  />
                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 text-white font-bold text-xs cursor-pointer backdrop-blur-[2px]"
                  >
                    <Maximize2 className="w-4 h-4 text-emerald-400" />
                    <span>Click to view full screenshot</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-[#0f1219]/60 text-center flex flex-col items-center justify-center space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">No Match Screenshot (SS) Attached</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {isAdmin ? 'Attach an eFootball screenshot to verify result authenticity' : 'No screenshot proof was submitted for this fixture yet'}
                    </p>
                  </div>

                  {isAdmin && onUpdateScreenshot && (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer transition active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Uploading...' : 'Upload Match SS'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Match Notes / Remarks if any */}
            {match.notes && (
              <div className="rounded-xl bg-[#0a0c10] border border-slate-800 p-3 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Match Remarks
                  </span>
                  <p className="text-xs text-slate-200">{match.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#0a0c10] flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => onShareMatch(match)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Share Card</span>
            </button>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => onEditMatch(match)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isCompleted ? 'Edit Score / SS' : 'Submit Result'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Fullscreen Image Modal */}
      {isLightboxOpen && activeProofUrl && (
        <div
          className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-3 animate-in fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <a
              href={activeProofUrl}
              download={`match_${match.round}_${match.id}.png`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Upload className="w-4 h-4 rotate-180" />
              <span>Download</span>
            </a>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="max-w-4xl max-h-[85vh] p-2 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeProofUrl}
              alt="Match Screenshot Proof Full"
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-slate-800 shadow-2xl"
            />
            <p className="text-xs text-slate-400 mt-2 font-mono">
              MD {match.round}: {homeTeam.clubName} ({homeTeam.managerName}) vs {awayTeam.clubName} ({awayTeam.managerName})
            </p>
          </div>
        </div>
      )}
    </>
  );
};
