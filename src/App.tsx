import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Activity, Settings } from 'lucide-react';
import {
  loadTournamentState,
  saveTournamentState,
  resetTournamentSchedule,
  exportTournamentToJson,
  StoredState,
} from './utils/storage';
import {
  subscribeToLeagueState,
  updateMatchInCloud,
  updateMatchScreenshotInCloud,
  saveLeagueStateToCloud,
} from './lib/firestoreLeague';
import { testFirestoreConnection } from './lib/firebase';
import {
  calculateStandings,
  getTournamentSummary,
  calculateTeamAttackLeaderboard,
  calculateTeamDefenseLeaderboard,
} from './utils/calculations';
import { seedSampleMatches } from './utils/sampleData';
import { getCurrentAdmin, logoutAdmin, AdminUser } from './utils/auth';
import { Team, Match, TournamentConfig } from './types';
import { Header } from './components/Header';
import { StandingsTable } from './components/StandingsTable';
import { FixturesView } from './components/FixturesView';
import { TeamsListView } from './components/TeamsListView';
import { TournamentRecordsView } from './components/TournamentRecordsView';
import { SubmitResultModal } from './components/SubmitResultModal';
import { TeamDetailModal } from './components/TeamDetailModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { ShareFixtureCardModal } from './components/ShareFixtureCardModal';
import { TournamentSettingsModal } from './components/TournamentSettingsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import {
  SubmissionSuccessPopup,
  SubmittedMatchSummary,
} from './components/SubmissionSuccessPopup';

export default function App() {
  const [tournamentState, setTournamentState] = useState<StoredState>(() =>
    loadTournamentState()
  );
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() =>
    getCurrentAdmin()
  );

  const [activeTab, setActiveTab] = useState<
    'standings' | 'fixtures' | 'teams' | 'records'
  >('standings');

  // Modal States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedMatchForSubmit, setSelectedMatchForSubmit] = useState<Match | null>(null);

  const [selectedMatchForDetail, setSelectedMatchForDetail] = useState<Match | null>(null);

  const [selectedTeamForDetail, setSelectedTeamForDetail] = useState<Team | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedMatchForShare, setSelectedMatchForShare] = useState<Match | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Submit Result Success Notification State
  const [isSuccessPopupOpen, setIsSuccessPopupOpen] = useState(false);
  const [submittedMatchInfo, setSubmittedMatchInfo] = useState<SubmittedMatchSummary | null>(null);

  // Admin Auth Gate State
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);
  const [loginPromptReason, setLoginPromptReason] = useState<string>(
    'Admin authentication is required to modify tournament data.'
  );

  // Real-time Firestore Cloud Subscription (Syncs live across all users & devices anywhere)
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      if (connected) {
        setIsCloudSynced(true);
      }
    });

    const unsubscribe = subscribeToLeagueState(
      (cloudState) => {
        setTournamentState(cloudState);
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Firestore real-time connection notice, local cache active:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync to local storage on change
  useEffect(() => {
    saveTournamentState(tournamentState);
  }, [tournamentState]);

  // Derived real-time calculations
  const { teams, matches, config, byesPerRound } = tournamentState;

  const standings = calculateStandings(teams, matches, config);
  const summary = getTournamentSummary(matches, standings, teams);
  const attackStats = calculateTeamAttackLeaderboard(teams, matches);
  const defenseStats = calculateTeamDefenseLeaderboard(teams, matches);

  // Close all active modals/popups across the entire application
  const closeAllModals = () => {
    setIsAdminLoginModalOpen(false);
    setIsSubmitModalOpen(false);
    setSelectedMatchForSubmit(null);
    setSelectedMatchForDetail(null);
    setSelectedTeamForDetail(null);
    setIsShareModalOpen(false);
    setSelectedMatchForShare(null);
    setIsSettingsModalOpen(false);
    setPendingAdminAction(null);
  };

  // Stacked Admin Auth Gate: Opens over existing modal without destroying underlying view
  const handleOpenLoginModal = (reason?: string, nextAction?: () => void) => {
    setLoginPromptReason(
      reason || 'Admin authentication is required to access league controls.'
    );
    if (nextAction) {
      setPendingAdminAction(() => nextAction);
    }
    setIsAdminLoginModalOpen(true);
  };

  // Require admin auth before executing protected actions
  const requireAdminAuth = (action: () => void, reason: string) => {
    if (adminUser) {
      action();
    } else {
      handleOpenLoginModal(reason, action);
    }
  };

  const handleAdminLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
    const nextAction = pendingAdminAction;
    setIsAdminLoginModalOpen(false);
    setPendingAdminAction(null);
    if (nextAction) {
      nextAction();
    }
  };

  const handleLogoutAdmin = () => {
    logoutAdmin();
    setAdminUser(null);
  };

  // Protected Handlers (Saved to Firebase Firestore with instant real-time broadcast)
  const handleSaveMatch = async (updatedMatch: Match) => {
    const newMatches = matches.map((m) =>
      m.id === updatedMatch.id ? updatedMatch : m
    );
    setTournamentState((prev) => ({
      ...prev,
      matches: newMatches,
    }));
    closeAllModals();

    const homeTeam = teams.find((t) => t.id === updatedMatch.homeTeamId);
    const awayTeam = teams.find((t) => t.id === updatedMatch.awayTeamId);

    setSubmittedMatchInfo({
      round: updatedMatch.round,
      homeTeamName: homeTeam?.clubName || 'Home Team',
      awayTeamName: awayTeam?.clubName || 'Away Team',
      homeScore: updatedMatch.homeScore,
      awayScore: updatedMatch.awayScore,
    });
    setIsSuccessPopupOpen(true);

    try {
      await updateMatchInCloud(updatedMatch, matches);
    } catch (err) {
      console.error('Failed to sync match update to Firestore:', err);
    }
  };

  const handleUpdateScreenshot = (matchId: string, screenshotUrl?: string) => {
    requireAdminAuth(async () => {
      const newMatches = matches.map((m) =>
        m.id === matchId ? { ...m, screenshotUrl } : m
      );
      setTournamentState((prev) => ({
        ...prev,
        matches: newMatches,
      }));
      if (selectedMatchForDetail && selectedMatchForDetail.id === matchId) {
        setSelectedMatchForDetail((prev) => (prev ? { ...prev, screenshotUrl } : null));
      }

      try {
        await updateMatchScreenshotInCloud(matchId, screenshotUrl, matches);
      } catch (err) {
        console.error('Failed to sync match screenshot to Firestore:', err);
      }
    }, 'Admin login is required to upload or modify match screenshots.');
  };

  const handleOpenSubmitForMatch = (match: Match | null) => {
    requireAdminAuth(() => {
      setSelectedMatchForSubmit(match);
      setIsSubmitModalOpen(true);
    }, 'Admin login is mandatory to submit or edit match results.');
  };

  const handleOpenSettingsModal = () => {
    requireAdminAuth(() => {
      closeAllModals();
      setIsSettingsModalOpen(true);
    }, 'Admin login is mandatory to modify tournament settings or reset schedules.');
  };

  const handleOpenShareForMatch = (match: Match) => {
    setSelectedMatchForShare(match);
    setIsShareModalOpen(true);
  };

  const handleOpenMatchDetail = (match: Match) => {
    // Keep selectedTeamForDetail open so MatchDetailModal overlays gracefully
    setSelectedMatchForDetail(match);
  };

  const handleCloseMatchDetail = () => {
    setSelectedMatchForDetail(null);
  };

  const handleOpenTeamDetail = (team: Team) => {
    setSelectedMatchForDetail(null);
    setSelectedTeamForDetail(team);
  };

  const handleCloseTeamDetail = () => {
    setSelectedTeamForDetail(null);
    setSelectedMatchForDetail(null);
  };

  const handleResetSchedule = async (isDouble: boolean) => {
    const newConfig: TournamentConfig = {
      ...config,
      format: isDouble ? 'double_round_robin' : 'single_round_robin',
    };
    const newState = resetTournamentSchedule(teams, newConfig);
    setTournamentState(newState);

    try {
      await saveLeagueStateToCloud(newState);
    } catch (err) {
      console.error('Failed to sync schedule reset to Firestore:', err);
    }
  };

  const handleSeedSampleData = async () => {
    const seeded = seedSampleMatches(matches, teams);
    const newState: StoredState = {
      ...tournamentState,
      matches: seeded,
    };
    setTournamentState(newState);

    try {
      await saveLeagueStateToCloud(newState);
    } catch (err) {
      console.error('Failed to sync sample data to Firestore:', err);
    }
  };

  const handleExportJson = () => {
    const jsonStr = exportTournamentToJson(tournamentState);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `efootball-premier-league-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (jsonString: string) => {
    const parsed = JSON.parse(jsonString) as StoredState;
    if (parsed.teams && parsed.matches && parsed.config) {
      setTournamentState(parsed);
      try {
        await saveLeagueStateToCloud(parsed);
      } catch (err) {
        console.error('Failed to sync imported data to Firestore:', err);
      }
    } else {
      throw new Error('Invalid state structure');
    }
  };

  const handleSaveConfig = async (newConfig: TournamentConfig) => {
    const newState: StoredState = {
      ...tournamentState,
      config: newConfig,
    };
    setTournamentState(newState);

    try {
      await saveLeagueStateToCloud(newState);
    } catch (err) {
      console.error('Failed to sync config to Firestore:', err);
    }
  };

  const selectedTeamStandingsRow = selectedTeamForDetail
    ? standings.find((s) => s.team.id === selectedTeamForDetail.id) || null
    : null;

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Primary Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        totalMatches={summary.totalMatches}
        completedMatches={summary.completedMatches}
        totalGoals={summary.totalGoals}
        avgGoals={summary.avgGoals}
        leader={summary.leader}
        topScoringTeam={summary.topScoringTeam}
        topDefendingTeam={summary.topDefendingTeam}
        mostCleanSheetsTeam={summary.mostCleanSheetsTeam}
        hottestStreakTeam={summary.hottestStreakTeam}
        adminUser={adminUser}
        isCloudSynced={isCloudSynced}
        onOpenLoginModal={() =>
          handleOpenLoginModal('Admin authentication is required to access league controls.')
        }
        onLogoutAdmin={handleLogoutAdmin}
        onOpenSubmitModal={() => handleOpenSubmitForMatch(null)}
        onOpenSettingsModal={handleOpenSettingsModal}
        onSelectTeam={(team) => handleOpenTeamDetail(team)}
      />

      {/* Main Content Area */}
      <main id="tournament-main-workspace" className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 lg:px-6 py-3.5">
        {/* STANDINGS TABLE TAB */}
        {activeTab === 'standings' && (
          <StandingsTable
            standings={standings}
            teams={teams}
            matches={matches}
            config={config}
            onSelectTeam={(team) => handleOpenTeamDetail(team)}
            onOpenSubmitModal={() => handleOpenSubmitForMatch(null)}
            isAdmin={!!adminUser}
          />
        )}

        {/* FIXTURES & RESULTS TAB (HOME & AWAY) */}
        {activeTab === 'fixtures' && (
          <FixturesView
            matches={matches}
            teams={teams}
            config={config}
            byesPerRound={byesPerRound}
            onEditMatch={handleOpenSubmitForMatch}
            onShareMatch={handleOpenShareForMatch}
            onSelectTeam={(team) => handleOpenTeamDetail(team)}
            onViewMatchDetail={(match) => handleOpenMatchDetail(match)}
            isAdmin={!!adminUser}
          />
        )}

        {/* TEAMS & MANAGERS TAB */}
        {activeTab === 'teams' && (
          <TeamsListView
            teams={teams}
            standings={standings}
            onSelectTeam={(team) => handleOpenTeamDetail(team)}
          />
        )}

        {/* TOURNAMENT RECORDS & STATS TAB (ANALYTICS HUB) */}
        {activeTab === 'records' && (
          <TournamentRecordsView
            teams={teams}
            matches={matches}
            standings={standings}
            config={config}
            attackStats={attackStats}
            defenseStats={defenseStats}
            onSelectTeam={(team) => handleOpenTeamDetail(team)}
            onViewMatchDetail={(match) => handleOpenMatchDetail(match)}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-[#0a0c10] py-3.5 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2.5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 text-center md:text-left">
            {/* Precise Tournament Spec */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap text-white font-medium text-xs">
                <span className="text-emerald-400 font-bold font-mono">eFootball Mobile</span>
                <span className="text-slate-600">•</span>
                <span>21 Participating Clubs</span>
                <span className="text-slate-600">•</span>
                <span>Double Round-Robin Format (42 Matchdays)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official 420-fixture season (20 Home &amp; 20 Away matches per club) • Win = 3 Pts, Draw = 1 Pt, Loss = 0 Pts
              </p>
            </div>

            {/* Quick Live Stats & Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end text-[11px]">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Season Progress:{' '}
                  <strong className="text-white font-mono">{summary.completedMatches}</strong> /{' '}
                  {summary.totalMatches} Fixtures ({summary.progressPercentage}%)
                </span>
              </div>

              <button
                onClick={handleOpenSettingsModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 rounded-lg transition cursor-pointer"
                title="Open League Settings & Data Backup"
              >
                <Settings className="w-3 h-3 text-slate-400" />
                <span>League Settings &amp; Backup</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[10px] text-slate-400">
            <div>
              Tip: Click on any club in the Standings or Teams view to inspect squad managers, head-to-head records, and full fixture history.
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Real-time Sync Active
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* Primary Workspaces (Exclusive) */}
      <SubmitResultModal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          setIsSubmitModalOpen(false);
          setSelectedMatchForSubmit(null);
        }}
        matches={matches}
        teams={teams}
        initialMatch={selectedMatchForSubmit}
        onSaveMatch={handleSaveMatch}
      />

      <MatchDetailModal
        isOpen={!!selectedMatchForDetail}
        onClose={handleCloseMatchDetail}
        match={selectedMatchForDetail}
        teams={teams}
        isAdmin={!!adminUser}
        parentTeamContext={selectedTeamForDetail}
        onEditMatch={(match) => handleOpenSubmitForMatch(match)}
        onShareMatch={(match) => handleOpenShareForMatch(match)}
        onSelectTeam={(team) => handleOpenTeamDetail(team)}
        onUpdateScreenshot={handleUpdateScreenshot}
      />

      <TeamDetailModal
        isOpen={!!selectedTeamForDetail}
        onClose={handleCloseTeamDetail}
        team={selectedTeamForDetail}
        standingsRow={selectedTeamStandingsRow}
        matches={matches}
        teams={teams}
        byesPerRound={byesPerRound}
        totalRounds={config.totalRounds || 42}
        isAdmin={!!adminUser}
        onEditMatch={handleOpenSubmitForMatch}
        onViewMatchDetail={(match) => handleOpenMatchDetail(match)}
      />

      <ShareFixtureCardModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSelectedMatchForShare(null);
        }}
        match={selectedMatchForShare}
        teams={teams}
      />

      <TournamentSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeAllModals}
        config={config}
        teams={teams}
        onSaveConfig={handleSaveConfig}
        onResetSchedule={handleResetSchedule}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* Stacked Modals (Layered over primary modals) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => {
          setIsAdminLoginModalOpen(false);
          setPendingAdminAction(null);
        }}
        onSuccess={handleAdminLoginSuccess}
        actionReason={loginPromptReason}
      />

      {/* Auto-closing Match Submission Success Floating Popup (Non-blocking toast, no dark overlay) */}
      <SubmissionSuccessPopup
        isOpen={isSuccessPopupOpen}
        onClose={() => setIsSuccessPopupOpen(false)}
        matchSummary={submittedMatchInfo}
        durationMs={3500}
      />
      
      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}
