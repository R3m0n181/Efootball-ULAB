import React, { useState } from 'react';
import {
  X,
  Settings,
  Download,
  Upload,
  Save,
  Calendar,
  Zap,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { TournamentConfig, Team, SecondLegPattern, Match } from '../types';
import { SECOND_LEG_PATTERNS_METADATA } from '../utils/scheduler';

interface TournamentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TournamentConfig;
  teams: Team[];
  matches?: Match[];
  onSaveConfig: (config: TournamentConfig) => void;
  onResetSchedule: (isDouble: boolean) => void;
  onRealignSecondLeg?: (pattern: SecondLegPattern) => { success: boolean; message: string };
  onExportJson: () => void;
  onImportJson: (jsonString: string) => void;
}

export const TournamentSettingsModal: React.FC<TournamentSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  teams,
  matches = [],
  onSaveConfig,
  onResetSchedule,
  onRealignSecondLeg,
  onExportJson,
  onImportJson,
}) => {
  const [name, setName] = useState(config.name);
  const [season, setSeason] = useState(config.season);
  const [format, setFormat] = useState<'single_round_robin' | 'double_round_robin'>(
    config.format
  );
  const [secondLegPattern, setSecondLegPattern] = useState<SecondLegPattern>(
    config.secondLegPattern || 'crescendo'
  );
  const [pointsWin, setPointsWin] = useState(config.pointsForWin);
  const [pointsDraw, setPointsDraw] = useState(config.pointsForDraw);
  const [pointsLoss, setPointsLoss] = useState(config.pointsForLoss);
  const [currentRound, setCurrentRound] = useState(config.currentRound || 1);

  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [realignStatus, setRealignStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    const totalRounds = config.totalRounds || 42;
    const boundedRound = Math.max(1, Math.min(Number(currentRound) || 1, totalRounds));
    onSaveConfig({
      ...config,
      name,
      season,
      format,
      secondLegPattern,
      currentRound: boundedRound,
      pointsForWin: Number(pointsWin),
      pointsForDraw: Number(pointsDraw),
      pointsForLoss: Number(pointsLoss),
    });
    onClose();
  };

  const handleRealignClick = () => {
    if (onRealignSecondLeg) {
      const res = onRealignSecondLeg(secondLegPattern);
      setRealignStatus({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setTimeout(() => setRealignStatus(null), 4500);
    }
  };

  const handleImportSubmit = () => {
    try {
      if (!importText.trim()) return;
      onImportJson(importText);
      setImportStatus('Tournament data imported successfully!');
      setTimeout(() => {
        setImportStatus(null);
        onClose();
      }, 1200);
    } catch {
      setImportStatus('Invalid JSON format. Please check file data.');
    }
  };

  const totalRounds = config.totalRounds || 42;
  const halfRounds = Math.floor(totalRounds / 2);
  const leg2Matches = matches.filter((m) => m.round > halfRounds);
  const anyLeg2Played = leg2Matches.some((m) => m.status === 'completed' || m.homeScore !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f1219] border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 bg-[#0a0c10] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tournament Admin &amp; Settings</h3>
              <p className="text-[11px] text-slate-400">League format, rules, and calendar optimization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* General info */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tournament Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[9px] text-slate-400 mb-0.5">Tournament Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 mb-0.5">Season / Edition</label>
                <input
                  type="text"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Tournament Format & Structure */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tournament Schedule &amp; Format
              </h4>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-300 font-mono">
                Double Round-Robin
              </span>
            </div>

            {/* Format Description Card */}
            <div className="p-3 bg-[#0a0c10] border border-slate-800/80 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>21 Teams • Asymmetric Double Round-Robin (42 Matchdays)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                All 21 participating clubs play each opponent twice across 42 matchdays (20 Home &amp; 20 Away matches per club, plus 2 designated bye rounds). The 2nd leg utilizes an asymmetric schedule designed to avoid predictable repetition and optimize table drama.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Total Fixtures: <strong className="text-white font-mono">420 Matches</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Matches per Club: <strong className="text-white font-mono">40 Matches</strong></span>
                </div>
              </div>
            </div>

            {/* 2nd Leg Volatility Pattern Selector */}
            <div className="p-3 bg-[#0f1422] border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">2nd Leg Schedule Pattern (Table Volatility)</span>
                    <span className="text-[10px] text-slate-400">Controls how return fixtures are sequenced to maximize table movements</span>
                  </div>
                </div>
              </div>

              {/* Pattern options */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {(Object.keys(SECOND_LEG_PATTERNS_METADATA) as SecondLegPattern[]).map((patternKey) => {
                  const meta = SECOND_LEG_PATTERNS_METADATA[patternKey];
                  const isSelected = secondLegPattern === patternKey;
                  return (
                    <button
                      key={patternKey}
                      type="button"
                      onClick={() => setSecondLegPattern(patternKey)}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-[#0a0c10] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span className="text-xs font-bold text-white">{meta.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                          patternKey === 'crescendo'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : patternKey === 'shockwaves'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : patternKey === 'gauntlet'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        }`}>
                          {meta.volatilityRating}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">{meta.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Re-align Calendar Button */}
              {onRealignSecondLeg && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {anyLeg2Played
                        ? '2nd leg matches in progress (calendar locked)'
                        : 'Re-align unplayed 2nd leg fixtures immediately:'}
                    </span>
                    <button
                      type="button"
                      onClick={handleRealignClick}
                      disabled={anyLeg2Played}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Apply Pattern to Calendar</span>
                    </button>
                  </div>

                  {realignStatus && (
                    <div className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                      realignStatus.type === 'success'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}>
                      {realignStatus.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      )}
                      <span>{realignStatus.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active Matchday Controller */}
            <div className="p-3 bg-[#141824] border border-amber-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Active Matchday (Current Round)</span>
                  <span className="text-[11px] text-slate-400">Controls which matchdays are actively being played and counted in Manager Log backlog calculations</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-black text-xs">
                  MD {currentRound}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min={1}
                  max={config.totalRounds || 42}
                  value={currentRound}
                  onChange={(e) => setCurrentRound(Number(e.target.value))}
                  className="flex-1 accent-amber-500 cursor-pointer"
                />
                <select
                  value={currentRound}
                  onChange={(e) => setCurrentRound(Number(e.target.value))}
                  className="bg-[#0a0c10] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-mono font-bold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {Array.from({ length: config.totalRounds || 42 }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r}>
                      Matchday {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Points System */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              League Points System
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] text-slate-400 mb-0.5">Win Points</label>
                <input
                  type="number"
                  value={pointsWin}
                  onChange={(e) => setPointsWin(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 mb-0.5">Draw Points</label>
                <input
                  type="number"
                  value={pointsDraw}
                  onChange={(e) => setPointsDraw(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 mb-0.5">Loss Points</label>
                <input
                  type="number"
                  value={pointsLoss}
                  onChange={(e) => setPointsLoss(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Data Backup &amp; Restore
            </h4>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportJson}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#0a0c10] border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>Export Tournament Data (JSON)</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] text-slate-400">
                Paste JSON data to import/restore:
              </label>
              <textarea
                rows={2}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='Paste exported JSON state here...'
                className="w-full bg-[#0a0c10] border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={!importText.trim()}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold rounded-lg transition inline-flex items-center gap-1 text-xs cursor-pointer"
              >
                <Upload className="w-3 h-3 text-emerald-400" />
                <span>Import JSON</span>
              </button>
              {importStatus && (
                <p className="text-[10px] text-emerald-400 mt-0.5">{importStatus}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
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
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition shadow-sm shadow-emerald-500/20 active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
