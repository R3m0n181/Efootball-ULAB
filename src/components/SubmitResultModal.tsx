import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  CheckCircle2,
  Upload,
  Loader2,
} from 'lucide-react';
import { Match, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { compressScreenshot } from '../utils/imageCompressor';
import { fetchMatchProof } from '../lib/matchProofs';

interface SubmitResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  teams: Team[];
  initialMatch?: Match | null;
  onSaveMatch: (updatedMatch: Match) => void;
}

export const SubmitResultModal: React.FC<SubmitResultModalProps> = ({
  isOpen,
  onClose,
  matches,
  teams,
  initialMatch,
  onSaveMatch,
}) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  // Initialize or synchronize selected match
  useEffect(() => {
    if (!isOpen) return;

    const targetMatch = initialMatch || matches.find((m) => m.status !== 'completed') || matches[0];
    if (targetMatch) {
      setSelectedMatchId(targetMatch.id);
      setHomeScore(targetMatch.homeScore !== null ? targetMatch.homeScore : 0);
      setAwayScore(targetMatch.awayScore !== null ? targetMatch.awayScore : 0);
      setNotes(targetMatch.notes || '');

      if (targetMatch.screenshotUrl) {
        setScreenshotPreview(targetMatch.screenshotUrl);
      } else {
        setScreenshotPreview(null);
        fetchMatchProof(targetMatch.id).then((url) => {
          if (url) setScreenshotPreview(url);
        });
      }
    }
  }, [initialMatch, matches, isOpen]);

  if (!isOpen) return null;

  const currentMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];
  const homeTeam = currentMatch ? teamMap.get(currentMatch.homeTeamId) : null;
  const awayTeam = currentMatch ? teamMap.get(currentMatch.awayTeamId) : null;

  const handleMatchSelect = (mId: string) => {
    setSelectedMatchId(mId);
    const m = matches.find((item) => item.id === mId);
    if (m) {
      setHomeScore(m.homeScore !== null ? m.homeScore : 0);
      setAwayScore(m.awayScore !== null ? m.awayScore : 0);
      setNotes(m.notes || '');

      if (m.screenshotUrl) {
        setScreenshotPreview(m.screenshotUrl);
      } else {
        setScreenshotPreview(null);
        fetchMatchProof(m.id).then((url) => {
          if (url) setScreenshotPreview(url);
        });
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressScreenshot(file);
        setScreenshotPreview(compressed);
      } catch (err) {
        console.error('Failed to compress screenshot, falling back to original:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshotPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSave = () => {
    if (!currentMatch || isCompressing) return;

    const updated: Match = {
      ...currentMatch,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      status: 'completed',
      playedAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
      screenshotUrl: screenshotPreview || undefined,
    };

    onSaveMatch(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f1219] border border-slate-700/80 rounded-xl w-full max-w-lg shadow-2xl shadow-black/80 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-3 border-b border-slate-800 bg-[#0a0c10] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Submit Match Result</h3>
              <p className="text-[10px] text-slate-400">
                Log final team scoreline to update Premier League standings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Match Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Match Fixture
            </label>
            <select
              value={selectedMatchId}
              onChange={(e) => handleMatchSelect(e.target.value)}
              className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {matches.map((m) => {
                const h = teamMap.get(m.homeTeamId);
                const a = teamMap.get(m.awayTeamId);
                if (!h || !a) return null;
                const scoreLabel =
                  m.status === 'completed' ? ` (Final: ${m.homeScore} - ${m.awayScore})` : ' [Scheduled]';
                return (
                  <option key={m.id} value={m.id}>
                    MD {m.round}: {h.clubName} ({h.managerName}) vs {a.clubName} ({a.managerName}){scoreLabel}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Teams Scoreboard Controller - Team Name Top, Player Below */}
          {homeTeam && awayTeam && (
            <div className="bg-[#0a0c10] p-4 rounded-xl border border-slate-800 shadow-inner">
              <div className="grid grid-cols-5 items-center gap-2">
                {/* Home team */}
                <div className="col-span-2 flex flex-col items-center text-center">
                  <TeamLogo team={homeTeam} size="lg" className="mb-1.5" />
                  {/* Team Name First */}
                  <div className="font-bold text-white text-xs sm:text-sm truncate max-w-full">
                    {homeTeam.clubName}
                  </div>
                  {/* Player Name Below */}
                  <div className="text-[11px] text-slate-400 truncate max-w-full">
                    {homeTeam.managerName}
                  </div>

                  {/* Score stepper */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => setHomeScore((s) => Math.max(0, s - 1))}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={homeScore}
                      onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center text-xl font-black font-mono text-emerald-400 bg-slate-900 border border-slate-700 rounded py-0.5 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setHomeScore((s) => s + 1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Center VS */}
                <div className="col-span-1 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Matchday {currentMatch?.round}</span>
                  <div className="text-xl font-mono font-black text-slate-400 my-1">:</div>
                  <span className="text-[9px] text-slate-500">Home vs Away</span>
                </div>

                {/* Away team */}
                <div className="col-span-2 flex flex-col items-center text-center">
                  <TeamLogo team={awayTeam} size="lg" className="mb-1.5" />
                  {/* Team Name First */}
                  <div className="font-bold text-white text-xs sm:text-sm truncate max-w-full">
                    {awayTeam.clubName}
                  </div>
                  {/* Player Name Below */}
                  <div className="text-[11px] text-slate-400 truncate max-w-full">
                    {awayTeam.managerName}
                  </div>

                  {/* Score stepper */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => setAwayScore((s) => Math.max(0, s - 1))}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={awayScore}
                      onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center text-xl font-black font-mono text-emerald-400 bg-slate-900 border border-slate-700 rounded py-0.5 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setAwayScore((s) => s + 1)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Match Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 90th min winner, tight defense, 3-2 comeback..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Screenshot Proof upload */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Match Result Screenshot Proof (SS)
            </label>
            {screenshotPreview ? (
              <div className="relative rounded-xl border border-slate-700 bg-black/60 p-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={screenshotPreview}
                    alt="Proof Preview"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-700 shadow"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Screenshot Attached</span>
                    <span className="text-[10px] text-emerald-400">Ready to save &amp; sync to cloud</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenshotPreview(null)}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-lg transition cursor-pointer"
                >
                  Remove SS
                </button>
              </div>
            ) : isCompressing ? (
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#0a0c10] border border-slate-800 text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mb-1.5" />
                <span className="text-white font-medium">Optimizing match screenshot...</span>
                <span className="text-[10px] text-slate-500">Preparing lightweight cloud sync</span>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0a0c10] border border-dashed border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-slate-200 cursor-pointer transition text-xs group">
                <Upload className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition" />
                <span className="font-semibold text-white">Click or drag &amp; drop eFootball match screenshot (SS)</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Supports PNG, JPG, WebP (auto-optimized for cloud sync)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#0a0c10] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isCompressing}
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-sm shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            {isCompressing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing Image...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Update Standings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
