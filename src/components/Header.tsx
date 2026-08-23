import React from 'react';
import {
  Trophy,
  Calendar,
  Shield,
  ShieldCheck,
  Settings,
  Flame,
  Lock,
  Unlock,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { TournamentConfig, StandingsRow, TeamAttackStat, TeamDefenseStat, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { AdminUser } from '../utils/auth';
import { LEAGUE_LOGO } from '../assets/leagueLogo';

interface HeaderProps {
  activeTab: 'standings' | 'fixtures' | 'teams';
  setActiveTab: (tab: 'standings' | 'fixtures' | 'teams') => void;
  config: TournamentConfig;
  totalMatches: number;
  completedMatches: number;
  totalGoals: number;
  avgGoals: string;
  leader: StandingsRow | null;
  topScoringTeam?: TeamAttackStat | null;
  mostCleanSheetsTeam?: TeamDefenseStat | null;
  adminUser: AdminUser | null;
  isCloudSynced?: boolean;
  onOpenLoginModal: () => void;
  onLogoutAdmin: () => void;
  onOpenSubmitModal: () => void;
  onOpenSettingsModal: () => void;
  onSelectTeam?: (team: Team) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  config,
  totalMatches,
  completedMatches,
  totalGoals,
  avgGoals,
  leader,
  topScoringTeam,
  mostCleanSheetsTeam,
  adminUser,
  isCloudSynced = true,
  onOpenLoginModal,
  onLogoutAdmin,
  onOpenSubmitModal,
  onOpenSettingsModal,
  onSelectTeam,
}) => {
  const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return (
    <header className="border-b border-slate-800 bg-[#0a0c10]">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Tournament Info */}
          <div className="flex items-center gap-3">
            <div className="relative group shrink-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/40 bg-slate-900 flex items-center justify-center p-0.5">
                <img
                  src={LEAGUE_LOGO}
                  alt="eFootball League Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition duration-300"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase bg-emerald-500 text-slate-950 rounded font-mono">
                  eFootball Mobile
                </span>
                {adminUser && (
                  <>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.2 rounded-full">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {isCloudSynced ? 'Cloud Live Sync' : 'Connecting...'}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      <Unlock className="w-3 h-3 text-emerald-400" />
                      Admin Access
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
                {config.name}
              </h1>
              <p className="text-[11px] text-slate-400">
                21 Teams. Double Round-Robin Format (42 Matchdays)
              </p>
            </div>
          </div>

          {/* Quick Actions & Auth */}
          <div className="flex items-center gap-2 flex-wrap">
            {adminUser ? (
              <div className="flex items-center gap-1.5 bg-[#0f1219] border border-emerald-500/30 rounded-lg p-1 px-2 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium text-[11px] max-w-[130px] truncate">
                  {adminUser.email}
                </span>
                <button
                  onClick={onLogoutAdmin}
                  title="Logout Admin"
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                id="header-admin-login-btn"
                onClick={onOpenLoginModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#0f1219] hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-lg transition active:scale-95 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Login</span>
              </button>
            )}

            <button
              id="header-settings-btn"
              onClick={onOpenSettingsModal}
              title="Tournament Settings & Export"
              className="p-2 text-slate-400 hover:text-white bg-[#0f1219] hover:bg-slate-800 border border-slate-800 rounded-lg transition active:scale-95 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tournament Vital Stats Strip */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2">
          {/* Upper Metrics Grid: Matches Progress & Goals Tally */}
          <div className="grid grid-cols-2 gap-2">
            {/* Matches Progress */}
            <div className="bg-[#0f1219] border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Matches Played</div>
                <div className="text-xs sm:text-sm font-bold text-white font-mono">
                  {completedMatches} <span className="text-slate-500">/ {totalMatches}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400 font-mono">{progressPercent}%</span>
                <div className="w-14 sm:w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Goals Tally */}
            <div className="bg-[#0f1219] border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Total Goals</div>
                <div className="text-xs sm:text-sm font-bold text-white font-mono">
                  {totalGoals} <span className="text-[10px] text-slate-500 font-normal">({avgGoals}/gm)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Highlighted League Leader Block (Positioned prominently above Top Scoring Team) */}
          <div
            onClick={() => leader && onSelectTeam && onSelectTeam(leader.team)}
            className={`relative overflow-hidden rounded-xl border-2 transition-all p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
              leader && completedMatches > 0
                ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-[#0f1219] border-emerald-500/60 shadow-lg shadow-emerald-950/40 hover:border-emerald-400 hover:shadow-emerald-900/40 cursor-pointer'
                : 'bg-gradient-to-r from-emerald-950/30 via-[#0f1219] to-[#0f1219] border-emerald-500/30 shadow-md'
            }`}
          >
            {/* Ambient emerald backlight */}
            <div className="absolute -top-8 -left-8 w-24 h-24 bg-emerald-500/15 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center gap-3 min-w-0 z-10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-amber-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-md shadow-emerald-950/50 shrink-0">
                <Trophy className="w-4 h-4 text-amber-400 drop-shadow" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    League Leader
                  </span>
                  {leader && completedMatches > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black shadow-sm">
                      🏆 1ST PLACE
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      #1 SPOT
                    </span>
                  )}
                </div>

                <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5 mt-0.5">
                  {leader && completedMatches > 0 ? (
                    <>
                      <TeamLogo team={leader.team} size="xs" />
                      <span className="text-emerald-300 font-black hover:underline">{leader.team.clubName}</span>
                      <span className="text-slate-300 text-xs font-normal">({leader.team.managerName})</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs font-normal">Season Initialized (0 Matches Played)</span>
                  )}
                </div>
              </div>
            </div>

            {leader && completedMatches > 0 && (
              <div className="flex items-center gap-3 self-end sm:self-center bg-[#0a0c10]/90 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-mono shrink-0 shadow-inner z-10">
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase tracking-tight font-sans">Points</div>
                  <div className="text-xs sm:text-sm font-black text-emerald-400 leading-none">{leader.points} PTS</div>
                </div>
                <div className="h-5 w-px bg-slate-800" />
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase tracking-tight font-sans">Goal Diff</div>
                  <div className="text-[11px] sm:text-xs font-bold text-slate-200 leading-none">
                    GD {leader.goalDifference > 0 ? `+${leader.goalDifference}` : leader.goalDifference}
                  </div>
                </div>
                <div className="h-5 w-px bg-slate-800" />
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 uppercase tracking-tight font-sans">Form / Record</div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-300 leading-none">
                    {leader.won}W {leader.drawn}D {leader.lost}L
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Under League Leader: Top Scoring Team & Most Clean Sheets Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Top Scoring Team */}
            <div
              onClick={() => topScoringTeam && onSelectTeam && onSelectTeam(topScoringTeam.team)}
              className={`bg-[#0f1219] border border-slate-800/90 rounded-lg p-2 flex items-center gap-2.5 ${
                topScoringTeam && completedMatches > 0 && onSelectTeam
                  ? 'hover:border-amber-500/50 hover:bg-[#141822] cursor-pointer transition'
                  : ''
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Top Scoring Team</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">ATTACK</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5 mt-0.5">
                    {topScoringTeam && completedMatches > 0 ? (
                      <>
                        <TeamLogo team={topScoringTeam.team} size="xs" />
                        <span className="text-amber-400 hover:underline">{topScoringTeam.team.clubName}</span>
                        <span className="text-slate-400 text-xs font-normal">({topScoringTeam.team.managerName})</span>
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs font-normal">Awaiting completed matches</span>
                    )}
                  </div>
                </div>
                {topScoringTeam && completedMatches > 0 && (
                  <div className="text-right pl-2 font-mono shrink-0">
                    <div className="text-xs font-bold text-amber-400">{topScoringTeam.goalsScored} Goals</div>
                    <div className="text-[10px] text-slate-400">{topScoringTeam.goalsPerMatch} / gm</div>
                  </div>
                )}
              </div>
            </div>

            {/* Most Clean Sheets Team */}
            <div
              onClick={() => mostCleanSheetsTeam && onSelectTeam && onSelectTeam(mostCleanSheetsTeam.team)}
              className={`bg-[#0f1219] border border-slate-800/90 rounded-lg p-2 flex items-center gap-2.5 ${
                mostCleanSheetsTeam && completedMatches > 0 && onSelectTeam
                  ? 'hover:border-cyan-500/50 hover:bg-[#141822] cursor-pointer transition'
                  : ''
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Most Clean Sheets</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">DEFENSE</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5 mt-0.5">
                    {mostCleanSheetsTeam && completedMatches > 0 ? (
                      <>
                        <TeamLogo team={mostCleanSheetsTeam.team} size="xs" />
                        <span className="text-cyan-400 hover:underline">{mostCleanSheetsTeam.team.clubName}</span>
                        <span className="text-slate-400 text-xs font-normal">({mostCleanSheetsTeam.team.managerName})</span>
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs font-normal">Awaiting completed matches</span>
                    )}
                  </div>
                </div>
                {mostCleanSheetsTeam && completedMatches > 0 && (
                  <div className="text-right pl-2 font-mono shrink-0">
                    <div className="text-xs font-bold text-cyan-400">{mostCleanSheetsTeam.cleanSheets} Clean Sheets</div>
                    <div className="text-[10px] text-slate-400">{mostCleanSheetsTeam.cleanSheetPct}% CS rate</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Navigation Tabs with Highlighted Over & Under Dividers */}
        <div className="mt-3">
          {/* Highlighted divider line OVER the tab selection */}
          <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/20 via-emerald-400/90 to-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.5)]" />

          <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              id="tab-standings"
              onClick={() => setActiveTab('standings')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeTab === 'standings'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1219]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Standings Table</span>
            </button>

            <button
              id="tab-fixtures"
              onClick={() => setActiveTab('fixtures')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeTab === 'fixtures'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1219]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Fixtures &amp; Schedule (Home &amp; Away)</span>
            </button>

            <button
              id="tab-teams"
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeTab === 'teams'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1219]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Clubs &amp; Teams</span>
            </button>
          </div>

          {/* Highlighted divider line UNDER the tab selection */}
          <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/20 via-emerald-400/90 to-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
        </div>
      </div>
    </header>
  );
};
