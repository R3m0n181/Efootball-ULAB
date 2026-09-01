import React, { useState } from 'react';
import { X, Share2, Copy, Check } from 'lucide-react';
import { Match, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { LEAGUE_LOGO } from '../assets/leagueLogo';

interface ShareFixtureCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  teams: Team[];
}

export const ShareFixtureCardModal: React.FC<ShareFixtureCardModalProps> = ({
  isOpen,
  onClose,
  match,
  teams,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !match) return null;

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const homeTeam = teamMap.get(match.homeTeamId);
  const awayTeam = teamMap.get(match.awayTeamId);

  if (!homeTeam || !awayTeam) return null;

  const isCompleted = match.status === 'completed';

  const generateShareText = () => {
    let text = `🏆 eFootball Mobile Premier League - Matchday ${match.round}\n`;
    text += `⚽ ${homeTeam.clubName} (${homeTeam.managerName}) vs ${awayTeam.clubName} (${awayTeam.managerName})\n`;
    if (isCompleted) {
      text += `📊 FINAL SCORE: ${homeTeam.clubName} ${match.homeScore} - ${match.awayScore} ${awayTeam.clubName}\n`;
      if (match.notes) {
        text += `📝 Notes: ${match.notes}\n`;
      }
    } else {
      text += `⏳ Match Status: Scheduled\n`;
    }
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f1219] border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-xl w-full max-w-md shadow-2xl shadow-black/80 overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 bg-[#0a0c10] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Share Match Result Card</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close share card"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Graphic Preview */}
        <div className="p-4 overflow-y-auto space-y-3">
          <div
            id="shareable-match-card"
            className="p-4 rounded-xl bg-gradient-to-br from-[#0a0c10] via-[#0f1219] to-[#0a0c10] border border-emerald-500/30 shadow-xl relative overflow-hidden text-center"
          >
            {/* Background Glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Tournament badge */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <img
                src={LEAGUE_LOGO}
                alt="EFL Logo"
                className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500/50"
              />
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 uppercase tracking-wider font-mono">
                eFootball Mobile League
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                • Matchday {match.round}
              </span>
            </div>

            {/* Match Teams & Score */}
            <div className="grid grid-cols-5 items-center gap-1.5 my-3">
              {/* Home */}
              <div className="col-span-2 flex flex-col items-center">
                <TeamLogo team={homeTeam} size="lg" className="mb-1" />
                {/* Club Name First */}
                <div className="font-bold text-xs text-white truncate max-w-full">
                  {homeTeam.clubName}
                </div>
                {/* Player Name Below */}
                <div className="text-[10px] text-slate-400 truncate max-w-full">
                  {homeTeam.managerName}
                </div>
              </div>

              {/* Center Score or VS */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                {isCompleted ? (
                  <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 shadow-inner">
                    <span className="text-xl font-black font-mono text-emerald-300">
                      {match.homeScore} - {match.awayScore}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-black text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    VS
                  </span>
                )}
                <span className="text-[8px] text-slate-500 uppercase mt-0.5">
                  {isCompleted ? 'Final' : 'Scheduled'}
                </span>
              </div>

              {/* Away */}
              <div className="col-span-2 flex flex-col items-center">
                <TeamLogo team={awayTeam} size="lg" className="mb-1" />
                {/* Club Name First */}
                <div className="font-bold text-xs text-white truncate max-w-full">
                  {awayTeam.clubName}
                </div>
                {/* Player Name Below */}
                <div className="text-[10px] text-slate-400 truncate max-w-full">
                  {awayTeam.managerName}
                </div>
              </div>
            </div>

            {/* Notes if any */}
            {isCompleted && match.notes && (
              <div className="mt-2 text-[10px] text-slate-400 italic">
                &ldquo;{match.notes}&rdquo;
              </div>
            )}
          </div>

          {/* Share Action */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleCopy}
              className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied for WhatsApp / Discord / Messenger!' : 'Copy Match Summary'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
