import React, { useState, useEffect } from 'react';
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
} from './utils/calculations';
import { seedSampleMatches } from './utils/sampleData';
import { getCurrentAdmin, logoutAdmin, AdminUser } from './utils/auth';
import { Team, Match, TournamentConfig } from './types';
import { Header } from './components/Header';
import { StandingsTable } from './components/StandingsTable';
import { FixturesView } from './components/FixturesView';
import { TeamsListView } from './components/TeamsListView';
import { SubmitResultModal } from './components/SubmitResultModal';
import { TeamDetailModal } from './components/TeamDetailModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { ShareFixtureCardModal } from './components/ShareFixtureCardModal';
import { TournamentSettingsModal } from './components/TournamentSettingsModal';
import { AdminLoginModal } from './components/AdminLoginModal';

export default function App() {
  const [tournamentState, setTournamentState] = useState<StoredState>(() =>
    loadTournamentState()
  );
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() =>
    getCurrentAdmin()
  );

  const [activeTab, setActiveTab] = useState<
    'standings' | 'fixtures' | 'teams'
  >('standings');

  // Modal States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedMatchForSubmit, setSelectedMatchForSubmit] = useState<Match | null>(null);

  const [selectedMatchForDetail, setSelectedMatchForDetail] = useState<Match | null>(null);

  const [selectedTeamForDetail, setSelectedTeamForDetail] = useState<Team | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedMatchForShare, setSelectedMatchForShare] = useState<Match | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
  const summary = getTournamentSummary(matches, standings);

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

  const handleOpenLoginModal = (reason?: string, nextAction?: () => void) => {
    closeAllModals();
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
    closeAllModals();
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
      closeAllModals();
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
    closeAllModals();
    setSelectedMatchForShare(match);
    setIsShareModalOpen(true);
  };

  const handleOpenMatchDetail = (match: Match) => {
    closeAllModals();
    setSelectedMatchForDetail(match);
  };

  const handleOpenTeamDetail = (team: Team) => {
    closeAllModals();
    setSelectedTeamForDetail(team);
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
        adminUser={adminUser}
        isCloudSynced={isCloudSynced}
        onOpenLoginModal={() =>
          handleOpenLoginModal('Admin authentication is required to access league controls.')
        }
        onLogoutAdmin={handleLogoutAdmin}
        onOpenSubmitModal={() => handleOpenSubmitForMatch(null)}
        onOpenSettingsModal={handleOpenSettingsModal}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 lg:px-6 py-3.5">
        {/* STANDINGS TABLE TAB */}
        {activeTab === 'standings' && (
          <StandingsTable
            standings={standings}
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
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#0f1219] py-2.5 text-center text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <span>eFootball Mobile Premier League Portal • 21 Participating Teams</span>
          <div className="flex items-center gap-2.5 text-slate-400">
            <span className="text-emerald-400">Home &amp; Away Schedule Active</span>
            <span>•</span>
            <button
              onClick={handleOpenSettingsModal}
              className="hover:text-emerald-400 underline transition cursor-pointer"
            >
              League Settings &amp; Export
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={closeAllModals}
        onSuccess={handleAdminLoginSuccess}
        actionReason={loginPromptReason}
      />

      <SubmitResultModal
        isOpen={isSubmitModalOpen}
        onClose={closeAllModals}
        matches={matches}
        teams={teams}
        initialMatch={selectedMatchForSubmit}
        onSaveMatch={handleSaveMatch}
      />

      <MatchDetailModal
        isOpen={!!selectedMatchForDetail}
        onClose={closeAllModals}
        match={selectedMatchForDetail}
        teams={teams}
        isAdmin={!!adminUser}
        onEditMatch={(match) => handleOpenSubmitForMatch(match)}
        onShareMatch={(match) => handleOpenShareForMatch(match)}
        onSelectTeam={(team) => handleOpenTeamDetail(team)}
        onUpdateScreenshot={handleUpdateScreenshot}
      />

      <TeamDetailModal
        isOpen={!!selectedTeamForDetail}
        onClose={closeAllModals}
        team={selectedTeamForDetail}
        standingsRow={selectedTeamStandingsRow}
        matches={matches}
        teams={teams}
        onEditMatch={handleOpenSubmitForMatch}
        onViewMatchDetail={(match) => handleOpenMatchDetail(match)}
      />

      <ShareFixtureCardModal
        isOpen={isShareModalOpen}
        onClose={closeAllModals}
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
        onSeedSampleData={handleSeedSampleData}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />
    </div>
  );
}
