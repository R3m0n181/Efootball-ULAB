import React, { useEffect, useState } from 'react';
import { CheckCircle2, X, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SubmittedMatchSummary {
  round: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
}

interface SubmissionSuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  matchSummary: SubmittedMatchSummary | null;
  durationMs?: number;
}

export const SubmissionSuccessPopup: React.FC<SubmissionSuccessPopupProps> = ({
  isOpen,
  onClose,
  matchSummary,
  durationMs = 3200,
}) => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (isPaused) return;

    const timer = setTimeout(() => {
      onClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isOpen, isPaused, durationMs, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="match-submit-success-popup-backdrop"
          className="fixed inset-0 z-50 pointer-events-none flex items-start sm:items-end justify-center sm:justify-end p-4 sm:p-6"
        >
          <motion.div
            id="match-submit-success-popup"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="pointer-events-auto w-full max-w-sm bg-[#0f131c]/95 border border-emerald-500/30 rounded-xl shadow-2xl shadow-emerald-950/40 backdrop-blur-md overflow-hidden"
          >
            <div className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-white">
                        Match Data Submitted
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/20 text-emerald-300">
                        Saved
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Scores and player stats saved &amp; synced live across the league.
                    </p>
                  </div>
                </div>

                <button
                  id="close-submit-success-popup-btn"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800/60 transition cursor-pointer shrink-0"
                  aria-label="Close notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {matchSummary && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 bg-slate-900/40 rounded-lg p-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-slate-400 font-mono">
                      MD {matchSummary.round}
                    </span>
                    <span className="font-medium text-slate-200 truncate max-w-[170px]">
                      {matchSummary.homeTeamName} vs {matchSummary.awayTeamName}
                    </span>
                  </div>
                  {matchSummary.homeScore !== undefined && matchSummary.awayScore !== undefined && (
                    <span className="font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-[11px]">
                      {matchSummary.homeScore} - {matchSummary.awayScore}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Auto-closing progress indicator */}
            <div className="h-0.5 w-full bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{
                  duration: durationMs / 1000,
                  ease: 'linear',
                }}
                className="h-full bg-emerald-500"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
