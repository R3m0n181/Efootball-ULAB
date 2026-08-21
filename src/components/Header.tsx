import React from 'react';
import {
  Trophy,
  Calendar,
  Shield,
  PlusCircle,
  Settings,
  Flame,
  Lock,
  Unlock,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { TournamentConfig, StandingsRow } from '../types';
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
  adminUser: AdminUser | null;
  isCloudSynced?: boolean;
  onOpenLoginModal: () => void;
  onLogoutAdmin: () => void;
  onOpenSubmitModal: () => void;
  onOpenSettingsModal: () => void;
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
  adminUser,
  isCloudSynced = true,
  onOpenLoginModal,
  onLogoutAdmin,
  onOpenSubmitModal,
  onOpenSettingsModal,
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
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.2 rounded-full">
                  <span className={`w-1.5 h-1.5 rounded-full ${isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {isCloudSynced ? 'Cloud Live Sync' : 'Connecting...'}
                </span>
                {adminUser ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <Unlock className="w-3 h-3 text-emerald-400" />
                    Admin Access
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Read-Only
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
                {config.name}
              </h1>
              <p className="text-[11px] text-slate-400">
                21 Teams • Home & Away System (42 Matchdays) • Premier League Format
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

            {adminUser && (
              <button
                id="header-submit-result-btn"
                onClick={onOpenSubmitModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 rounded-lg transition shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit Match Score</span>
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
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Matches Progress */}
          <div className="bg-[#0f1219] border border-slate-800 rounded-lg p-2 flex items-center justify-between">
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
          <div className="bg-[#0f1219] border border-slate-800 rounded-lg p-2 flex items-center gap-2.5">
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

          {/* Table Leader: Club Name First, Player Below */}
          <div className="bg-[#0f1219] border border-slate-800 rounded-lg p-2 flex items-center gap-2.5 col-span-2 sm:col-span-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">League Leader</div>
                <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                  {leader && completedMatches > 0 ? (
                    <>
                      <TeamLogo team={leader.team} size="xs" />
                      <span className="text-emerald-400">{leader.team.clubName}</span>
                      <span className="text-slate-400 text-xs font-normal">({leader.team.managerName})</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs">Season Initialized (0 Matches Played)</span>
                  )}
                </div>
              </div>
              {leader && completedMatches > 0 && (
                <div className="text-right pl-2 font-mono">
                  <div className="text-xs font-bold text-emerald-400">{leader.points} PTS</div>
                  <div className="text-[10px] text-slate-400">GD {leader.goalDifference > 0 ? `+${leader.goalDifference}` : leader.goalDifference}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar border-b border-slate-800/40">
          <button
            id="tab-standings"
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'standings'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1219]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Standings Table</span>
          </button>

          <button
            id="tab-fixtures"
            onClick={() => setActiveTab('fixtures')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'fixtures'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1219]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Fixtures &amp; Schedule (Home &amp; Away)</span>
          </button>

          <button
            id="tab-teams"
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1219]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Clubs &amp; Teams</span>
          </button>
        </div>
      </div>
    </header>
  );
};
