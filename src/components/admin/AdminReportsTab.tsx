import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  HardDrive,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Share2,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Match, Team, TournamentConfig } from '../../types';
import { calculateStandings } from '../../utils/calculations';
import { formatMatchRealLifeDateTime } from '../../utils/matchDateUtils';

interface AdminReportsTabProps {
  matches: Match[];
  teams: Team[];
  config: TournamentConfig;
  proofsMap: Map<string, string>;
  getProofForMatch: (match: Match) => string | null;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  matches,
  teams,
  config,
  proofsMap,
  getProofForMatch,
}) => {
  const [copiedStandingsText, setCopiedStandingsText] = useState(false);
  const [copiedMissingProofsText, setCopiedMissingProofsText] = useState(false);
  const [copiedSummaryText, setCopiedSummaryText] = useState(false);

  const teamMap = useMemo(() => {
    const map = new Map<string, Team>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const standings = useMemo(() => {
    return calculateStandings(teams, matches, config);
  }, [teams, matches, config]);

  const completedMatches = useMemo(() => {
    return matches.filter(
      (m) => m.status === 'completed' && m.homeScore !== null && m.awayScore !== null
    );
  }, [matches]);

  const matchesWithProof = useMemo(() => {
    return completedMatches.filter((m) => !!getProofForMatch(m));
  }, [completedMatches, getProofForMatch]);

  const matchesMissingProof = useMemo(() => {
    return completedMatches.filter((m) => !getProofForMatch(m));
  }, [completedMatches, getProofForMatch]);

  // CSV Export: All Fixtures & Results
  const handleExportFixturesCSV = () => {
    const headers = [
      'Round',
      'Match_ID',
      'Home_Club',
      'Home_Manager',
      'Away_Club',
      'Away_Manager',
      'Home_Score',
      'Away_Score',
      'Status',
      'Real_Life_Played_Date',
      'Real_Life_Played_Time',
      'Submitted_By',
      'Has_Screenshot_Proof',
      'Proof_URL',
    ];

    const rows = matches.map((m) => {
      const home = teamMap.get(m.homeTeamId);
      const away = teamMap.get(m.awayTeamId);
      const proofUrl = getProofForMatch(m);
      const { dateStr, timeStr } = formatMatchRealLifeDateTime(m);
      return [
        m.round,
        m.id,
        `"${home?.clubName || 'Unknown'}"`,
        `"${home?.managerName || 'Unknown'}"`,
        `"${away?.clubName || 'Unknown'}"`,
        `"${away?.managerName || 'Unknown'}"`,
        m.homeScore !== null ? m.homeScore : '',
        m.awayScore !== null ? m.awayScore : '',
        m.status,
        dateStr !== 'No date recorded' ? `"${dateStr}"` : '""',
        timeStr ? `"${timeStr}"` : '""',
        `"${m.submittedBy || ''}"`,
        proofUrl ? 'YES' : 'NO',
        proofUrl ? `"${proofUrl.slice(0, 100)}..."` : '',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${config.name.replace(/\s+/g, '_')}_all_fixtures.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export: League Standings
  const handleExportStandingsCSV = () => {
    const headers = [
      'Rank',
      'Club_Name',
      'Manager_Name',
      'Short_Code',
      'Played',
      'Won',
      'Drawn',
      'Lost',
      'Goals_For',
      'Goals_Against',
      'Goal_Difference',
      'Points',
    ];

    const rows = standings.map((s) => [
      s.rank,
      `"${s.team.clubName}"`,
      `"${s.team.managerName}"`,
      s.team.shortCode,
      s.played,
      s.won,
      s.drawn,
      s.lost,
      s.goalsFor,
      s.goalsAgainst,
      s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference,
      s.points,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${config.name.replace(/\s+/g, '_')}_standings.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Standings Announcement
  const handleCopyStandingsText = () => {
    const lines = [
      `🏆 *${config.name} — Official Standings Update* 🏆`,
      `Matches Recorded: ${completedMatches.length} / ${matches.length}`,
      '',
      '```',
      'Pos Club                    P  W  D  L  GD  Pts',
      '------------------------------------------------',
      ...standings.map((s) => {
        const rank = s.rank.toString().padStart(2, ' ');
        const name = (s.team.clubName || s.team.shortCode).padEnd(23, ' ').slice(0, 23);
        const p = s.played.toString().padStart(2, ' ');
        const w = s.won.toString().padStart(2, ' ');
        const d = s.drawn.toString().padStart(2, ' ');
        const l = s.lost.toString().padStart(2, ' ');
        const gd = (s.goalDifference > 0 ? `+${s.goalDifference}` : `${s.goalDifference}`).padStart(3, ' ');
        const pts = s.points.toString().padStart(3, ' ');
        return `${rank}. ${name} ${p} ${w} ${d} ${l} ${gd}  ${pts}`;
      }),
      '```',
      '',
      'Generated by Tournament Administration Hub',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedStandingsText(true);
    setTimeout(() => setCopiedStandingsText(false), 2500);
  };

  // Copy Missing Proofs Notice
  const handleCopyMissingProofs = () => {
    const lines = [
      `⚠️ *${config.name} — Outstanding Screenshot Proofs Audit* ⚠️`,
      `Total Completed Matches: ${completedMatches.length}`,
      `Matches Missing Proof: ${matchesMissingProof.length}`,
      '',
      '*Fixtures requiring screenshot verification from managers:*',
      ...(matchesMissingProof.length > 0
        ? matchesMissingProof.map((m) => {
            const home = teamMap.get(m.homeTeamId);
            const away = teamMap.get(m.awayTeamId);
            return `• Round ${m.round}: ${home?.clubName} (${home?.managerName}) ${m.homeScore}-${m.awayScore} ${away?.clubName} (${away?.managerName})`;
          })
        : ['✅ All completed matches have verified screenshot proofs!']),
      '',
      '📸 Managers involved, please share end-game screenshots with the commissioner.',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMissingProofsText(true);
    setTimeout(() => setCopiedMissingProofsText(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* 4 Storage & Audit Health Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Proof Assets Active</span>
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">{proofsMap.size}</div>
          <div className="text-[11px] text-slate-400 mt-1">Live Firestore synced proofs</div>
        </div>

        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Proof Compliance</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">
            {completedMatches.length > 0
              ? Math.round((matchesWithProof.length / completedMatches.length) * 100)
              : 100}
            %
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {matchesWithProof.length} of {completedMatches.length} verified
          </div>
        </div>

        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Missing Proofs</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">
            {matchesMissingProof.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Requiring screenshot proof</div>
        </div>

        <div className="bg-[#141824] border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Database Status</span>
            <Database className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white mt-0.5">Real-Time Sync</div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">
            Firestore &amp; Cache Active
          </div>
        </div>
      </div>

      {/* Export & Download Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CSV Exports Card */}
        <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Data &amp; Spreadsheet Exports
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Download raw tournament ledgers in standard CSV format for Excel, Google Sheets, or custom statistical models.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={handleExportFixturesCSV}
              className="flex-1 px-3.5 py-2 bg-[#141824] hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fixtures &amp; Scores CSV</span>
            </button>

            <button
              onClick={handleExportStandingsCSV}
              className="flex-1 px-3.5 py-2 bg-[#141824] hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>League Standings CSV</span>
            </button>
          </div>
        </div>

        {/* Community & Broadcast Reports Card */}
        <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Community Broadcast Announcements
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            One-click formatted text snippets optimized for WhatsApp, Discord, or Telegram tournament chat groups.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={handleCopyStandingsText}
              className="flex-1 px-3.5 py-2 bg-[#141824] hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {copiedStandingsText ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>{copiedStandingsText ? 'Standings Copied!' : 'Copy Standings Table'}</span>
            </button>

            <button
              onClick={handleCopyMissingProofs}
              className="flex-1 px-3.5 py-2 bg-[#141824] hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {copiedMissingProofsText ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{copiedMissingProofsText ? 'Report Copied!' : 'Copy Missing Proofs'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
