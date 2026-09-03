import React, { useState } from 'react';
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
  Users,
  Sparkles,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TournamentConfig, StandingsRow, TeamAttackStat, TeamDefenseStat, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { AdminUser } from '../utils/auth';
import { LEAGUE_LOGO } from '../assets/leagueLogo';

interface HeaderProps {
  activeTab: 'standings' | 'fixtures' | 'teams' | 'managerlog' | 'records' | 'admin';
  setActiveTab: (tab: 'standings' | 'fixtures' | 'teams' | 'managerlog' | 'records' | 'admin') => void;
  config: TournamentConfig;
  totalMatches: number;
  completedMatches: number;
  totalGoals: number;
  avgGoals: string;
  leader: StandingsRow | null;
  topScoringTeam?: TeamAttackStat | null;
  topDefendingTeam?: TeamDefenseStat | null;
  mostCleanSheetsTeam?: TeamDefenseStat | null;
  hottestStreakTeam?: {
    team: Team;
    streakCount: number;
    streakType: 'winning' | 'unbeaten';
    formString: ('W' | 'D' | 'L')[];
  } | null;
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
  topDefendingTeam,
  mostCleanSheetsTeam,
  hottestStreakTeam,
  adminUser,
  isCloudSynced = true,
  onOpenLoginModal,
  onLogoutAdmin,
  onOpenSubmitModal,
  onOpenSettingsModal,
  onSelectTeam,
}) => {
  const defendingTeam = topDefendingTeam || mostCleanSheetsTeam;
  const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
  const [showAllStatsMobile, setShowAllStatsMobile] = useState(false);

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
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.2 rounded-full">
                    <span className={`w-1.5 h-1.5 rounded-full ${isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {isCloudSynced ? 'Cloud Live Sync' : 'Connecting...'}
                  </span>
                )}
                {adminUser && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <Unlock className="w-3 h-3 text-emerald-400" />
                    Admin Access
                  </span>
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
          {/* Upper Global Progress Bar & Live Season Metrics */}
          <div className="bg-[#0f1219] border border-slate-800/90 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tournament Progress</span>
                <span className="text-white font-mono font-bold ml-1">
                  {completedMatches} <span className="text-slate-500 font-normal">/ {totalMatches} Matches</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Total Goals */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{totalGoals} Goals</span>
                <span className="text-[10px] text-slate-400 font-normal">({avgGoals}/match)</span>
              </div>

              {/* Progress pill & bar */}
              <div className="flex items-center gap-2">
                <div className="w-16 sm:w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-black text-emerald-400 min-w-[32px] text-right">
                  {progressPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* 4-Card Vital Showcase Grid (Leader, Top Attack, Best Defence, In-Form Streak) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* 1. LEAGUE LEADER */}
            <div
              id="vital-card-leader"
              onClick={() => leader && onSelectTeam && onSelectTeam(leader.team)}
              className={`relative overflow-hidden rounded-xl border p-2.5 flex flex-col justify-between transition-all ${
                leader && completedMatches > 0 && onSelectTeam
                  ? 'bg-gradient-to-br from-emerald-950/40 via-[#0f1219] to-[#0a0c10] border-emerald-500/40 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-950/40 cursor-pointer'
                  : 'bg-[#0f1219] border-slate-800/90'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Trophy className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 truncate">
                    League Leader
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-black border border-amber-500/30 shrink-0">
                  #1 RANK
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 min-w-0">
                {leader && completedMatches > 0 ? (
                  <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamLogo team={leader.team} size="md" />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-white hover:text-emerald-300 truncate block transition">
                          {leader.team.clubName}
                        </span>
                        <div className="text-[10px] text-slate-400 truncate">
                          {leader.team.managerName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0 pl-1">
                      <div className="text-xs sm:text-sm font-black text-emerald-400 leading-none">
                        {leader.points} PTS
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        GD {leader.goalDifference > 0 ? `+${leader.goalDifference}` : leader.goalDifference} • {leader.won}W
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs py-1">Awaiting match results</div>
                )}
              </div>
            </div>

            {/* 2. TOP ATTACKING TEAM */}
            <div
              id="vital-card-attack"
              onClick={() => topScoringTeam && onSelectTeam && onSelectTeam(topScoringTeam.team)}
              className={`relative overflow-hidden rounded-xl border p-2.5 flex-col justify-between transition-all ${
                showAllStatsMobile ? 'flex' : 'hidden sm:flex'
              } ${
                topScoringTeam && completedMatches > 0 && onSelectTeam
                  ? 'bg-gradient-to-br from-amber-950/30 via-[#0f1219] to-[#0a0c10] border-amber-500/40 hover:border-amber-400 hover:shadow-md hover:shadow-amber-950/40 cursor-pointer'
                  : 'bg-[#0f1219] border-slate-800/90'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Flame className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 truncate">
                    Top Attack
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-black border border-amber-500/30 shrink-0">
                  GOLDEN BOOT
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 min-w-0">
                {topScoringTeam && completedMatches > 0 ? (
                  <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamLogo team={topScoringTeam.team} size="md" />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-white hover:text-amber-300 truncate block transition">
                          {topScoringTeam.team.clubName}
                        </span>
                        <div className="text-[10px] text-slate-400 truncate">
                          {topScoringTeam.team.managerName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0 pl-1">
                      <div className="text-xs sm:text-sm font-black text-amber-400 leading-none">
                        {topScoringTeam.goalsScored} GF
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {topScoringTeam.goalsPerMatch} /match
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs py-1">Awaiting match results</div>
                )}
              </div>
            </div>

            {/* 3. BEST DEFENCE */}
            <div
              id="vital-card-defense"
              onClick={() => defendingTeam && onSelectTeam && onSelectTeam(defendingTeam.team)}
              className={`relative overflow-hidden rounded-xl border p-2.5 flex-col justify-between transition-all ${
                showAllStatsMobile ? 'flex' : 'hidden sm:flex'
              } ${
                defendingTeam && completedMatches > 0 && onSelectTeam
                  ? 'bg-gradient-to-br from-cyan-950/30 via-[#0f1219] to-[#0a0c10] border-cyan-500/40 hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-950/40 cursor-pointer'
                  : 'bg-[#0f1219] border-slate-800/90'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 truncate">
                    Best Defence
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-black border border-cyan-500/30 shrink-0">
                  GOLDEN GLOVE
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 min-w-0">
                {defendingTeam && completedMatches > 0 ? (
                  <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamLogo team={defendingTeam.team} size="md" />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-white hover:text-cyan-300 truncate block transition">
                          {defendingTeam.team.clubName}
                        </span>
                        <div className="text-[10px] text-slate-400 truncate">
                          {defendingTeam.team.managerName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0 pl-1">
                      <div className="text-xs sm:text-sm font-black text-cyan-400 leading-none">
                        {defendingTeam.goalsConceded} GA
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {defendingTeam.cleanSheets} Clean Sheets
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs py-1">Awaiting match results</div>
                )}
              </div>
            </div>

            {/* 4. FORM OF THE LEAGUE / HOTTEST STREAK */}
            <div
              id="vital-card-form"
              onClick={() => hottestStreakTeam && onSelectTeam && onSelectTeam(hottestStreakTeam.team)}
              className={`relative overflow-hidden rounded-xl border p-2.5 flex-col justify-between transition-all ${
                showAllStatsMobile ? 'flex' : 'hidden sm:flex'
              } ${
                hottestStreakTeam && completedMatches > 0 && onSelectTeam
                  ? 'bg-gradient-to-br from-rose-950/30 via-[#0f1219] to-[#0a0c10] border-rose-500/40 hover:border-rose-400 hover:shadow-md hover:shadow-rose-950/40 cursor-pointer'
                  : 'bg-[#0f1219] border-slate-800/90'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <TrendingUp className="w-3 h-3 text-rose-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 truncate">
                    League Form
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-black border border-rose-500/30 shrink-0">
                  {hottestStreakTeam && hottestStreakTeam.streakCount >= 2
                    ? `${hottestStreakTeam.streakCount} ${hottestStreakTeam.streakType === 'winning' ? 'WINS' : 'UNBEATEN'}`
                    : 'HOT STREAK'}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 min-w-0">
                {hottestStreakTeam && completedMatches > 0 ? (
                  <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamLogo team={hottestStreakTeam.team} size="md" />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-white hover:text-rose-300 truncate block transition">
                          {hottestStreakTeam.team.clubName}
                        </span>
                        <div className="text-[10px] text-slate-400 truncate">
                          {hottestStreakTeam.team.managerName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-1">
                      {/* Last 5 Form Badges */}
                      <div className="flex items-center gap-0.5 justify-end">
                        {hottestStreakTeam.formString.map((result, idx) => (
                          <span
                            key={idx}
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-[9px] font-bold rounded flex items-center justify-center font-mono ${
                              result === 'W'
                                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                                : result === 'D'
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                            }`}
                          >
                            {result}
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-rose-400 font-mono font-bold mt-0.5">
                        {hottestStreakTeam.streakCount >= 2
                          ? `${hottestStreakTeam.streakCount} in a row`
                          : 'Top Recent Form'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs py-1">Awaiting match results</div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Collapsible Buttons for Vital Stats */}
          <div className="sm:hidden mt-2">
            {!showAllStatsMobile ? (
              <button
                type="button"
                id="btn-expand-vital-stats-mobile"
                onClick={() => setShowAllStatsMobile(true)}
                className="w-full py-2 px-3 rounded-lg bg-[#0f1219] hover:bg-[#151a24] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer shadow-sm"
              >
                <span>More stats (Attack, Defense, Form)</span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            ) : (
              <button
                type="button"
                id="btn-collapse-vital-stats-mobile"
                onClick={() => setShowAllStatsMobile(false)}
                className="w-full py-2 px-3 rounded-lg bg-[#0f1219] hover:bg-[#151a24] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer shadow-sm"
              >
                <span>Hide stats</span>
                <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}
          </div>
        </div>

        {/* Primary Navigation Tabs with Highlighted Over & Under Dividers */}
        <div className="mt-3 relative">
          {/* Highlighted divider line OVER the tab selection */}
          <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/20 via-emerald-400/90 to-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.5)]" />

          {/* Left / Right mobile fade indicators */}
          <div className="pointer-events-none absolute left-0 top-[2px] bottom-[2px] w-4 bg-gradient-to-r from-[#0a0c10] to-transparent z-10 sm:hidden" />
          <div className="pointer-events-none absolute right-0 top-[2px] bottom-[2px] w-4 bg-gradient-to-l from-[#0a0c10] to-transparent z-10 sm:hidden" />

          <div
            id="header-nav-tabs"
            className="py-2.5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar touch-pan-x px-0.5"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
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
              <span>Fixtures &amp; Schedule</span>
            </button>

            <button
              id="tab-records"
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1219]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Records &amp; Stats</span>
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

            <button
              id="tab-managerlog"
              onClick={() => setActiveTab('managerlog')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                activeTab === 'managerlog'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1219]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manager Log</span>
            </button>

            {adminUser && (
              <button
                id="tab-admin"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1219]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Hub</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}
          </div>

          {/* Highlighted divider line UNDER the tab selection */}
          <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/20 via-emerald-400/90 to-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
        </div>
      </div>
    </header>
  );
};
