import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  CheckCircle2,
  Upload,
  Loader2,
  Ban,
  AlertTriangle,
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
  const [isDoubleForfeit, setIsDoubleForfeit] = useState<boolean>(false);
  const [singleForfeitTeam, setSingleForfeitTeam] = useState<'home' | 'away' | null>(null);

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  // Initialize or synchronize selected match
  useEffect(() => {
    if (!isOpen) return;

    const targetMatch = initialMatch || matches.find((m) => m.status !== 'completed' && m.status !== 'abandoned') || matches[0];
    if (targetMatch) {
      setSelectedMatchId(targetMatch.id);
      const isDouble = targetMatch.status === 'abandoned' || !!targetMatch.isDoubleForfeit;
      const isSingle = !!targetMatch.isSingleForfeit;

      setIsDoubleForfeit(isDouble);

      if (isSingle) {
        const forfeiter = targetMatch.forfeitedByTeamId === targetMatch.awayTeamId ? 'away' : 'home';
        setSingleForfeitTeam(forfeiter);
        setHomeScore(forfeiter === 'home' ? 0 : 3);
        setAwayScore(forfeiter === 'home' ? 3 : 0);
      } else {
        setSingleForfeitTeam(null);
        setHomeScore(isDouble ? 0 : (targetMatch.homeScore !== null ? targetMatch.homeScore : 0));
        setAwayScore(isDouble ? 0 : (targetMatch.awayScore !== null ? targetMatch.awayScore : 0));
      }

      setNotes(
        targetMatch.notes ||
        (isDouble
          ? 'Double Forfeit: 0 pts awarded to both clubs'
          : isSingle
          ? 'Single Forfeit: 3-0 walkover awarded'
          : '')
      );

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
      const isDouble = m.status === 'abandoned' || !!m.isDoubleForfeit;
      const isSingle = !!m.isSingleForfeit;

      setIsDoubleForfeit(isDouble);

      if (isSingle) {
        const forfeiter = m.forfeitedByTeamId === m.awayTeamId ? 'away' : 'home';
        setSingleForfeitTeam(forfeiter);
        setHomeScore(forfeiter === 'home' ? 0 : 3);
        setAwayScore(forfeiter === 'home' ? 3 : 0);
      } else {
        setSingleForfeitTeam(null);
        setHomeScore(isDouble ? 0 : (m.homeScore !== null ? m.homeScore : 0));
        setAwayScore(isDouble ? 0 : (m.awayScore !== null ? m.awayScore : 0));
      }

      setNotes(
        m.notes ||
        (isDouble
          ? 'Double Forfeit: 0 pts awarded to both clubs'
          : isSingle
          ? 'Single Forfeit: 3-0 walkover awarded'
          : '')
      );

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

  const handleToggleDoubleForfeit = () => {
    setIsDoubleForfeit((prev) => {
      const next = !prev;
      if (next) {
        setSingleForfeitTeam(null);
        setHomeScore(0);
        setAwayScore(0);
        if (!notes || notes.includes('Forfeit')) {
          setNotes('Double Forfeit: 0 pts awarded to both clubs');
        }
      } else {
        if (notes === 'Double Forfeit: 0 pts awarded to both clubs') {
          setNotes('');
        }
      }
      return next;
    });
  };

  const handleToggleSingleForfeit = (forfeiter: 'home' | 'away') => {
    if (singleForfeitTeam === forfeiter) {
      // Deselect single forfeit, return to editable scoreline
      setSingleForfeitTeam(null);
      setHomeScore(0);
      setAwayScore(0);
      if (notes.startsWith('Single Forfeit:')) {
        setNotes('');
      }
    } else {
      setIsDoubleForfeit(false);
      setSingleForfeitTeam(forfeiter);
      const winnerName = forfeiter === 'home'
        ? (awayTeam?.clubName || 'Away')
        : (homeTeam?.clubName || 'Home');
      const forfeiterName = forfeiter === 'home'
        ? (homeTeam?.clubName || 'Home')
        : (awayTeam?.clubName || 'Away');

      if (forfeiter === 'home') {
        setHomeScore(0);
        setAwayScore(3);
      } else {
        setHomeScore(3);
        setAwayScore(0);
      }

      if (!notes || notes.includes('Forfeit')) {
        setNotes(`Single Forfeit: ${forfeiterName} forfeited. 3-0 awarded to ${winnerName}`);
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

    const isSingle = singleForfeitTeam !== null;
    const computedHomeScore = isDoubleForfeit ? 0 : isSingle ? (singleForfeitTeam === 'home' ? 0 : 3) : Number(homeScore);
    const computedAwayScore = isDoubleForfeit ? 0 : isSingle ? (singleForfeitTeam === 'home' ? 3 : 0) : Number(awayScore);

    const updated: Match = {
      ...currentMatch,
      homeScore: computedHomeScore,
      awayScore: computedAwayScore,
      status: isDoubleForfeit ? 'abandoned' : 'completed',
      isDoubleForfeit: isDoubleForfeit ? true : undefined,
      isSingleForfeit: isSingle ? true : undefined,
      forfeitedByTeamId: isSingle
        ? (singleForfeitTeam === 'home' ? currentMatch.homeTeamId : currentMatch.awayTeamId)
        : undefined,
      playedAt: new Date().toISOString(),
      notes: isDoubleForfeit && !notes.trim()
        ? 'Double Forfeit: 0 pts awarded to both clubs'
        : isSingle && (!notes.trim() || notes.includes('Forfeit'))
        ? `Single Forfeit: 3-0 awarded to ${singleForfeitTeam === 'home' ? (awayTeam?.clubName || 'Away') : (homeTeam?.clubName || 'Home')}`
        : (notes.trim() || undefined),
      screenshotUrl: screenshotPreview || undefined,
    };

    onSaveMatch(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f1219] border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-xl w-full max-w-lg shadow-2xl shadow-black/80 overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-3.5 border-b border-slate-800 bg-[#0a0c10] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Submit Match Result</h3>
              <p className="text-[11px] text-slate-400">
                Log final scoreline to update Premier League standings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close submit modal"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Match Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Match Fixture
            </label>
            <select
              value={selectedMatchId}
              onChange={(e) => handleMatchSelect(e.target.value)}
              className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
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

          {/* Teams Scoreboard Controller - Mobile Touch-Optimized Steppers */}
          {homeTeam && awayTeam && (
            <div className={`p-3.5 sm:p-4 rounded-xl border shadow-inner transition-colors ${
              isDoubleForfeit
                ? 'bg-rose-950/15 border-rose-800/40'
                : singleForfeitTeam
                ? 'bg-amber-950/10 border-amber-800/40'
                : 'bg-[#0a0c10] border-slate-800'
            }`}>
              <div className="grid grid-cols-5 items-center gap-1.5 sm:gap-2">
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

                  {/* Single forfeit status pill */}
                  {singleForfeitTeam === 'home' && (
                    <span className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Forfeited (0)
                    </span>
                  )}
                  {singleForfeitTeam === 'away' && (
                    <span className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Awarded 3-0 (+3)
                    </span>
                  )}

                  {/* Touch-Friendly Score Stepper */}
                  <div className="flex items-center gap-1 sm:gap-1.5 mt-2.5">
                    <button
                      type="button"
                      disabled={isDoubleForfeit || singleForfeitTeam !== null}
                      onClick={() => setHomeScore((s) => Math.max(0, s - 1))}
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition flex items-center justify-center text-base cursor-pointer select-none"
                      aria-label="Decrease home score"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      disabled={isDoubleForfeit || singleForfeitTeam !== null}
                      value={homeScore}
                      onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                      className={`w-12 sm:w-14 text-center text-2xl sm:text-xl font-black font-mono bg-slate-900 border rounded-lg py-1 focus:outline-none ${
                        isDoubleForfeit
                          ? 'text-rose-400 border-rose-800/60 opacity-80 cursor-not-allowed'
                          : singleForfeitTeam === 'home'
                          ? 'text-rose-400 border-rose-800/60 bg-rose-950/20 cursor-not-allowed'
                          : singleForfeitTeam === 'away'
                          ? 'text-emerald-400 border-emerald-500/60 bg-emerald-950/20 cursor-not-allowed'
                          : 'text-emerald-400 border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      disabled={isDoubleForfeit || singleForfeitTeam !== null}
                      onClick={() => setHomeScore((s) => s + 1)}
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition flex items-center justify-center text-base cursor-pointer select-none"
                      aria-label="Increase home score"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Center VS */}
                <div className="col-span-1 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">MD {currentMatch?.round}</span>
                  <div className={`text-xl font-mono font-black my-1 ${
                    isDoubleForfeit
                      ? 'text-rose-400'
                      : singleForfeitTeam
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}>
                    :
                  </div>
                  <span className={`text-[9px] font-semibold text-center ${
                    isDoubleForfeit
                      ? 'text-rose-400 font-bold'
                      : singleForfeitTeam
                      ? 'text-amber-400 font-bold'
                      : 'text-slate-500'
                  }`}>
                    {isDoubleForfeit
                      ? 'FORFEIT'
                      : singleForfeitTeam === 'home'
                      ? 'FORFEIT (0-3)'
                      : singleForfeitTeam === 'away'
                      ? 'FORFEIT (3-0)'
                      : 'Home vs Away'}
                  </span>
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

                  {/* Single forfeit status pill */}
                  {singleForfeitTeam === 'away' && (
                    <span className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Forfeited (0)
                    </span>
                  )}
                  {singleForfeitTeam === 'home' && (
                    <span className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Awarded 3-0 (+3)
                    </span>
                  )}

                  {/* Touch-Friendly Score Stepper */}
                  <div className="flex items-center gap-1 sm:gap-1.5 mt-2.5">
                    <button
                      type="button"
                      disabled={isDoubleForfeit || singleForfeitTeam !== null}
                      onClick={() => setAwayScore((s) => Math.max(0, s - 1))}
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition flex items-center justify-center text-base cursor-pointer select-none"
                      aria-label="Decrease away score"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      disabled={isDoubleForfeit || singleForfeitTeam !== null}
                      value={awayScore}
                      onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                      className={`w-12 sm:w-14 text-center text-2xl sm:text-xl font-black font-mono bg-slate-900 border rounded-lg py-1 focus:outline-none ${
                        isDoubleForfeit
                          ? 'text-rose-400 border-rose-800/60 opacity-80 cursor-not-allowed'
                          : singleForfeitTeam === 'away'
                          ? 'text-rose-400 border-rose-800/60 bg-rose-950/20 cursor-not-allowed'
                          : singleForfeitTeam === 'home'
                          ? 'text-emerald-400 border-emerald-500/60 bg-emerald-950/20 cursor-not-allowed'
                          : 'text-emerald-400 border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      disabled={isDoubleForfeit || singleForfeitTeam !== null}
                      onClick={() => setAwayScore((s) => s + 1)}
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition flex items-center justify-center text-base cursor-pointer select-none"
                      aria-label="Increase away score"
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
              placeholder={
                isDoubleForfeit
                  ? "Double Forfeit: 0 pts awarded..."
                  : singleForfeitTeam
                  ? "Single Forfeit: 3-0 walkover awarded..."
                  : "e.g. 90th min winner, tight defense, 3-2 comeback..."
              }
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

          {/* Forfeits Section: Single Forfeit Located Just Over Double Forfeit Button */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            {/* 1. SINGLE FORFEIT OPTION (Just Over Double Forfeit Button) */}
            <div className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
              singleForfeitTeam
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-[#141824] border-slate-800'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    singleForfeitTeam ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Single Forfeit (3-0 Walkover)</span>
                    <span className="text-[10px] text-slate-400">
                      Select which team forfeits. Opponent receives a 3-0 victory (+3 pts).
                    </span>
                  </div>
                </div>

                {singleForfeitTeam && (
                  <button
                    type="button"
                    onClick={() => {
                      setSingleForfeitTeam(null);
                      setHomeScore(0);
                      setAwayScore(0);
                      if (notes.startsWith('Single Forfeit:')) setNotes('');
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Clear Forfeit
                  </button>
                )}
              </div>

              {/* Selector buttons for which team forfeits */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSingleForfeit('home')}
                  className={`p-2 rounded-lg text-left transition cursor-pointer border flex flex-col justify-between gap-1 ${
                    singleForfeitTeam === 'home'
                      ? 'bg-amber-500/25 border-amber-500 text-white shadow-sm shadow-amber-500/20 ring-1 ring-amber-500'
                      : 'bg-[#0a0c10] border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Home Forfeits</span>
                    {singleForfeitTeam === 'home' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-xs font-bold truncate max-w-full">
                    {homeTeam?.clubName || 'Home Club'}
                  </div>
                  <div className={`text-[10px] font-mono font-semibold ${
                    singleForfeitTeam === 'home' ? 'text-amber-300' : 'text-slate-400'
                  }`}>
                    Award: 0 - 3 (Away +3 pts)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleSingleForfeit('away')}
                  className={`p-2 rounded-lg text-left transition cursor-pointer border flex flex-col justify-between gap-1 ${
                    singleForfeitTeam === 'away'
                      ? 'bg-amber-500/25 border-amber-500 text-white shadow-sm shadow-amber-500/20 ring-1 ring-amber-500'
                      : 'bg-[#0a0c10] border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Away Forfeits</span>
                    {singleForfeitTeam === 'away' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-xs font-bold truncate max-w-full">
                    {awayTeam?.clubName || 'Away Club'}
                  </div>
                  <div className={`text-[10px] font-mono font-semibold ${
                    singleForfeitTeam === 'away' ? 'text-amber-300' : 'text-slate-400'
                  }`}>
                    Award: 3 - 0 (Home +3 pts)
                  </div>
                </button>
              </div>

              {/* Single Forfeit Banner details */}
              {singleForfeitTeam && (
                <div className="mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[11px] flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-100">
                      {singleForfeitTeam === 'home' ? awayTeam?.clubName : homeTeam?.clubName} awarded 3-0 victory!
                    </span>
                    <p className="text-[10px] text-amber-200/90 mt-0.5">
                      Winning team receives <strong>+3 points</strong>, <strong>+3 Goal Difference</strong>, and a <strong>clean sheet</strong>. Forfeiting club receives 0 points and -3 Goal Difference.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. DOUBLE FORFEIT ACTION (Located Under Single Forfeit Option) */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              isDoubleForfeit
                ? 'bg-rose-950/20 border-rose-500/40'
                : 'bg-[#141824] border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    isDoubleForfeit ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Ban className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Double Forfeit (Match Abandoned)</span>
                    <span className="text-[10px] text-slate-400">Award 0 pts to both clubs with 0-0 scoreline</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleDoubleForfeit}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${
                    isDoubleForfeit
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 ring-1 ring-rose-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {isDoubleForfeit ? 'Forfeit Active' : 'Declare Forfeit'}
                </button>
              </div>

              {/* Double Forfeit Notice Banner */}
              {isDoubleForfeit && (
                <div className="mt-2 p-2 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-[11px] flex items-start gap-2 animate-in fade-in duration-150">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-200">Abandon Match &amp; Double Forfeit</p>
                    <p className="text-[10px] text-rose-300/90 mt-0.5">
                      Both teams are awarded <strong>+1 Match Played</strong>, <strong>0 Points</strong>, and <strong>0 Goal Difference impact</strong>. Status will be recorded as <em>Abandoned</em>.
                    </p>
                  </div>
                </div>
              )}
            </div>
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
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDoubleForfeit
                ? 'text-white bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : singleForfeitTeam
                ? 'text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-amber-400/20'
                : 'text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
            }`}
          >
            {isCompressing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isDoubleForfeit ? (
              <Ban className="w-3.5 h-3.5" />
            ) : singleForfeitTeam ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>
              {isCompressing
                ? 'Processing Image...'
                : isDoubleForfeit
                ? 'Confirm Double Forfeit (Abandon)'
                : singleForfeitTeam === 'home'
                ? `Confirm Single Forfeit (${awayTeam?.clubName || 'Away'} 3-0)`
                : singleForfeitTeam === 'away'
                ? `Confirm Single Forfeit (${homeTeam?.clubName || 'Home'} 3-0)`
                : 'Confirm & Update Standings'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
