import React, { useState } from 'react';
import {
  X,
  Settings,
  Download,
  Upload,
  Save,
  Calendar,
} from 'lucide-react';
import { TournamentConfig, Team } from '../types';

interface TournamentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TournamentConfig;
  teams: Team[];
  onSaveConfig: (config: TournamentConfig) => void;
  onResetSchedule: (isDouble: boolean) => void;
  onExportJson: () => void;
  onImportJson: (jsonString: string) => void;
}

export const TournamentSettingsModal: React.FC<TournamentSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  teams,
  onSaveConfig,
  onResetSchedule,
  onExportJson,
  onImportJson,
}) => {
  const [name, setName] = useState(config.name);
  const [season, setSeason] = useState(config.season);
  const [format, setFormat] = useState<'single_round_robin' | 'double_round_robin'>(
    config.format
  );
  const [pointsWin, setPointsWin] = useState(config.pointsForWin);
  const [pointsDraw, setPointsDraw] = useState(config.pointsForDraw);
  const [pointsLoss, setPointsLoss] = useState(config.pointsForLoss);

  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      ...config,
      name,
      season,
      format,
      pointsForWin: Number(pointsWin),
      pointsForDraw: Number(pointsDraw),
      pointsForLoss: Number(pointsLoss),
    });
    onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-slate-800 bg-[#0a0c10] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Settings className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Tournament Admin &amp; Settings</h3>
              <p className="text-[10px] text-slate-400">League format, rules, and data backups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
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
                <span>21 Teams • Double Round-Robin Format (42 Matchdays)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This tournament follows a double round-robin system where all 21 participating clubs play each opponent twice across 42 matchdays (20 Home &amp; 20 Away matches per club, plus 2 designated bye rounds).
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
