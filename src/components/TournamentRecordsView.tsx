import React, { useState, useMemo } from 'react';
import {
  Zap,
  Flame,
  Castle,
  Target,
  Trophy,
  Award,
  TrendingUp,
  ShieldCheck,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Crown,
  RotateCcw,
  MapPin,
  Info,
} from 'lucide-react';
import { Team, Match, StandingsRow, TournamentConfig, TeamAttackStat, TeamDefenseStat } from '../types';
import { TeamLogo } from './TeamLogo';
import { AttackRankingView } from './AttackRankingView';
import { DefenseRankingView } from './DefenseRankingView';
import {
  calculateTeamAttackLeaderboard,
  calculateTeamDefenseLeaderboard,
} from '../utils/calculations';
import {
  getMatchHighsAndRecords,
  getTeamStreaksAndForm,
  getTeamHomeAwayStats,
  getTeamEfficiencyStats,
  getTeamMilestoneStats,
} from '../utils/recordCalculations';

interface TournamentRecordsViewProps {
  teams: Team[];
  matches: Match[];
  standings: StandingsRow[];
  config: TournamentConfig;
  attackStats?: TeamAttackStat[];
  defenseStats?: TeamDefenseStat[];
  initialSubTab?: TabType;
  onSelectTeam: (team: Team) => void;
  onViewMatchDetail?: (match: Match) => void;
}

type TabType = 'attack' | 'defense' | 'highs' | 'streaks' | 'efficiency' | 'points';

export const TournamentRecordsView: React.FC<TournamentRecordsViewProps> = ({
  teams,
  matches,
  standings,
  config,
  attackStats: externalAttackStats,
  defenseStats: externalDefenseStats,
  initialSubTab = 'attack',
  onSelectTeam,
  onViewMatchDetail,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Attack & Defense Leaderboards
  const internalAttackStats = useMemo(
    () => calculateTeamAttackLeaderboard(teams, matches),
    [teams, matches]
  );
  const attackStats = externalAttackStats || internalAttackStats;

  const internalDefenseStats = useMemo(
    () => calculateTeamDefenseLeaderboard(teams, matches),
    [teams, matches]
  );
  const defenseStats = externalDefenseStats || internalDefenseStats;

  // 1. Match Highs
  const matchHighs = useMemo(
    () => getMatchHighsAndRecords(teams, matches),
    [teams, matches]
  );

  const [expandedHighs, setExpandedHighs] = useState<{
    highestScoring?: boolean;
    biggestWins?: boolean;
    singleTeam?: boolean;
    awayWins?: boolean;
  }>({});

  const toggleHighsCategory = (category: 'highestScoring' | 'biggestWins' | 'singleTeam' | 'awayWins') => {
    setExpandedHighs((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // 2. Streaks & Form
  const streakStats = useMemo(
    () => getTeamStreaksAndForm(teams, matches),
    [teams, matches]
  );

  type StreakSortField =
    | 'club'
    | 'longestWinStreak'
    | 'currentWinStreak'
    | 'longestUnbeatenStreak'
    | 'currentUnbeatenStreak'
    | 'longestCleanSheetStreak'
    | 'longestScoringStreak'
    | 'form';

  const [streakSortField, setStreakSortField] = useState<StreakSortField>('longestUnbeatenStreak');
  const [streakSortDirection, setStreakSortDirection] = useState<'asc' | 'desc'>('desc');

  const isStreakSortChanged =
    streakSortField !== 'longestUnbeatenStreak' || streakSortDirection !== 'desc';

  const resetStreakSort = () => {
    setStreakSortField('longestUnbeatenStreak');
    setStreakSortDirection('desc');
  };

  const handleStreakSort = (field: StreakSortField) => {
    if (streakSortField === field) {
      setStreakSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setStreakSortField(field);
      setStreakSortDirection('desc');
    }
  };

  const renderStreakSortIcon = (field: StreakSortField) => {
    if (streakSortField === field) {
      return streakSortDirection === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-rose-400 shrink-0 inline-block ml-1" />
      ) : (
        <ArrowDown className="w-3 h-3 text-rose-400 shrink-0 inline-block ml-1" />
      );
    }
    return (
      <ArrowUpDown className="w-3 h-3 text-slate-600 shrink-0 inline-block ml-1 opacity-40 group-hover:opacity-100 transition" />
    );
  };

  const sortedStreakStats = useMemo(() => {
    const getFormScore = (form: ('W' | 'D' | 'L')[]) => {
      return form.reduce((acc, res) => acc + (res === 'W' ? 3 : res === 'D' ? 1 : 0), 0);
    };

    return [...streakStats].sort((a, b) => {
      let diff = 0;
      switch (streakSortField) {
        case 'club':
          diff = a.team.clubName.localeCompare(b.team.clubName);
          break;
        case 'longestWinStreak':
          diff = a.longestWinStreak - b.longestWinStreak;
          break;
        case 'currentWinStreak':
          diff = a.currentWinStreak - b.currentWinStreak;
          break;
        case 'longestUnbeatenStreak':
          diff = a.longestUnbeatenStreak - b.longestUnbeatenStreak;
          break;
        case 'currentUnbeatenStreak':
          diff = a.currentUnbeatenStreak - b.currentUnbeatenStreak;
          break;
        case 'longestCleanSheetStreak':
          diff = a.longestCleanSheetStreak - b.longestCleanSheetStreak;
          break;
        case 'longestScoringStreak':
          diff = a.longestScoringStreak - b.longestScoringStreak;
          break;
        case 'form':
          diff = getFormScore(a.last5Form) - getFormScore(b.last5Form);
          break;
        default:
          diff = 0;
      }

      if (diff !== 0) {
        return streakSortDirection === 'asc' ? diff : -diff;
      }

      return (
        b.longestUnbeatenStreak - a.longestUnbeatenStreak ||
        b.longestWinStreak - a.longestWinStreak ||
        a.team.clubName.localeCompare(b.team.clubName)
      );
    });
  }, [streakStats, streakSortField, streakSortDirection]);

  // 3. Home vs Away
  const homeAwayData = useMemo(
    () => getTeamHomeAwayStats(teams, matches, config),
    [teams, matches, config]
  );

  type HomeAwaySortField =
    | 'rank'
    | 'club'
    | 'played'
    | 'won'
    | 'drawn'
    | 'lost'
    | 'points'
    | 'goalsFor'
    | 'goalsAgainst'
    | 'goalDifference';

  const [homeAwaySubTab, setHomeAwaySubTab] = useState<'home' | 'away'>('home');
  const [homeAwaySortField, setHomeAwaySortField] = useState<HomeAwaySortField>('points');
  const [homeAwaySortDirection, setHomeAwaySortDirection] = useState<'asc' | 'desc'>('desc');

  const isHomeAwaySortChanged =
    homeAwaySortField !== 'points' || homeAwaySortDirection !== 'desc';

  const resetHomeAwaySort = () => {
    setHomeAwaySortField('points');
    setHomeAwaySortDirection('desc');
  };

  const handleHomeAwaySort = (field: HomeAwaySortField) => {
    if (homeAwaySortField === field) {
      setHomeAwaySortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setHomeAwaySortField(field);
      setHomeAwaySortDirection(field === 'lost' || field === 'goalsAgainst' ? 'asc' : 'desc');
    }
  };

  const renderHomeAwaySortIcon = (field: HomeAwaySortField) => {
    const accentColor = homeAwaySubTab === 'home' ? 'text-emerald-400' : 'text-cyan-400';
    if (homeAwaySortField === field) {
      return homeAwaySortDirection === 'asc' ? (
        <ArrowUp className={`w-3 h-3 ${accentColor} shrink-0 inline-block ml-1`} />
      ) : (
        <ArrowDown className={`w-3 h-3 ${accentColor} shrink-0 inline-block ml-1`} />
      );
    }
    return (
      <ArrowUpDown className="w-3 h-3 text-slate-600 shrink-0 inline-block ml-1 opacity-40 group-hover:opacity-100 transition" />
    );
  };

  const homeStandings = useMemo(() => {
    const list = homeAwayData.teamStats.map((item) => ({
      team: item.team,
      stats: item.home,
    }));
    list.sort(
      (a, b) =>
        b.stats.points - a.stats.points ||
        b.stats.goalDifference - a.stats.goalDifference ||
        b.stats.goalsFor - a.stats.goalsFor ||
        b.stats.won - a.stats.won ||
        a.team.clubName.localeCompare(b.team.clubName)
    );
    return list.map((item, index) => ({
      ...item,
      defaultRank: index + 1,
    }));
  }, [homeAwayData]);

  const awayStandings = useMemo(() => {
    const list = homeAwayData.teamStats.map((item) => ({
      team: item.team,
      stats: item.away,
    }));
    list.sort(
      (a, b) =>
        b.stats.points - a.stats.points ||
        b.stats.goalDifference - a.stats.goalDifference ||
        b.stats.goalsFor - a.stats.goalsFor ||
        b.stats.won - a.stats.won ||
        a.team.clubName.localeCompare(b.team.clubName)
    );
    return list.map((item, index) => ({
      ...item,
      defaultRank: index + 1,
    }));
  }, [homeAwayData]);

  const activeHomeAwayList = homeAwaySubTab === 'home' ? homeStandings : awayStandings;

  const sortedHomeAwayList = useMemo(() => {
    return [...activeHomeAwayList].sort((a, b) => {
      let diff = 0;
      switch (homeAwaySortField) {
        case 'rank':
          diff = a.defaultRank - b.defaultRank;
          break;
        case 'club':
          diff = a.team.clubName.localeCompare(b.team.clubName);
          break;
        case 'played':
          diff = a.stats.played - b.stats.played;
          break;
        case 'won':
          diff = a.stats.won - b.stats.won;
          break;
        case 'drawn':
          diff = a.stats.drawn - b.stats.drawn;
          break;
        case 'lost':
          diff = a.stats.lost - b.stats.lost;
          break;
        case 'points':
          diff = a.stats.points - b.stats.points;
          break;
        case 'goalsFor':
          diff = a.stats.goalsFor - b.stats.goalsFor;
          break;
        case 'goalsAgainst':
          diff = a.stats.goalsAgainst - b.stats.goalsAgainst;
          break;
        case 'goalDifference':
          diff = a.stats.goalDifference - b.stats.goalDifference;
          break;
        default:
          diff = 0;
      }

      if (diff !== 0) {
        return homeAwaySortDirection === 'asc' ? diff : -diff;
      }

      return a.defaultRank - b.defaultRank;
    });
  }, [activeHomeAwayList, homeAwaySortField, homeAwaySortDirection]);

  // 4. Efficiency
  const efficiencyStats = useMemo(
    () => getTeamEfficiencyStats(teams, matches),
    [teams, matches]
  );

  type EfficiencySortField =
    | 'matchesPlayed'
    | 'cleanSheetPct'
    | 'bttsPct'
    | 'over25Pct'
    | 'failedToScorePct'
    | 'goalDominanceRatio';

  const [efficiencySortField, setEfficiencySortField] = useState<EfficiencySortField>('cleanSheetPct');
  const [efficiencySortDirection, setEfficiencySortDirection] = useState<'asc' | 'desc'>('desc');

  const isEfficiencySortChanged =
    efficiencySortField !== 'cleanSheetPct' || efficiencySortDirection !== 'desc';

  const resetEfficiencySort = () => {
    setEfficiencySortField('cleanSheetPct');
    setEfficiencySortDirection('desc');
  };

  const handleEfficiencySort = (field: EfficiencySortField) => {
    if (efficiencySortField === field) {
      setEfficiencySortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setEfficiencySortField(field);
      setEfficiencySortDirection('desc');
    }
  };

  const renderEfficiencySortIcon = (field: EfficiencySortField) => {
    if (efficiencySortField === field) {
      return efficiencySortDirection === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-cyan-400 shrink-0 inline-block ml-1" />
      ) : (
        <ArrowDown className="w-3 h-3 text-cyan-400 shrink-0 inline-block ml-1" />
      );
    }
    return (
      <ArrowUpDown className="w-3 h-3 text-slate-600 shrink-0 inline-block ml-1 opacity-40 group-hover:opacity-100 transition" />
    );
  };

  const sortedEfficiencyStats = useMemo(() => {
    return [...efficiencyStats].sort((a, b) => {
      let diff = 0;
      switch (efficiencySortField) {
        case 'matchesPlayed':
          diff = a.matchesPlayed - b.matchesPlayed;
          break;
        case 'cleanSheetPct':
          diff = a.cleanSheetPct - b.cleanSheetPct || a.cleanSheets - b.cleanSheets;
          break;
        case 'bttsPct':
          diff = a.bttsPct - b.bttsPct || a.bttsCount - b.bttsCount;
          break;
        case 'over25Pct':
          diff = a.over25Pct - b.over25Pct || a.over25Count - b.over25Count;
          break;
        case 'failedToScorePct':
          diff = a.failedToScorePct - b.failedToScorePct || a.failedToScoreCount - b.failedToScoreCount;
          break;
        case 'goalDominanceRatio':
          diff =
            a.goalDominanceRatio - b.goalDominanceRatio ||
            (a.goalsFor - a.goalsAgainst) - (b.goalsFor - b.goalsAgainst);
          break;
        default:
          diff = 0;
      }

      if (diff !== 0) {
        return efficiencySortDirection === 'asc' ? diff : -diff;
      }

      // Tiebreaker
      return (
        b.cleanSheetPct - a.cleanSheetPct ||
        b.cleanSheets - a.cleanSheets ||
        b.goalDominanceRatio - a.goalDominanceRatio ||
        b.goalsFor - a.goalsFor
      );
    });
  }, [efficiencyStats, efficiencySortField, efficiencySortDirection]);

  // 5. Points & Milestones
  const totalTeamMatches = 2 * (teams.length - 1); // 40 for 21 teams
  const milestoneStats = useMemo(
    () => getTeamMilestoneStats(teams, standings, totalTeamMatches),
    [teams, standings, totalTeamMatches]
  );

  type PointsSortField =
    | 'played'
    | 'remainingMatches'
    | 'points'
    | 'ppg'
    | 'winRate'
    | 'maxPossiblePoints';

  const [pointsSortField, setPointsSortField] = useState<PointsSortField>('points');
  const [pointsSortDirection, setPointsSortDirection] = useState<'asc' | 'desc'>('desc');

  const isPointsSortChanged = pointsSortField !== 'points' || pointsSortDirection !== 'desc';

  const resetPointsSort = () => {
    setPointsSortField('points');
    setPointsSortDirection('desc');
  };

  const handlePointsSort = (field: PointsSortField) => {
    if (pointsSortField === field) {
      setPointsSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setPointsSortField(field);
      setPointsSortDirection('desc');
    }
  };

  const renderPointsSortIcon = (field: PointsSortField) => {
    if (pointsSortField === field) {
      return pointsSortDirection === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0 inline-block ml-1" />
      ) : (
        <ArrowDown className="w-3 h-3 text-emerald-400 shrink-0 inline-block ml-1" />
      );
    }
    return (
      <ArrowUpDown className="w-3 h-3 text-slate-600 shrink-0 inline-block ml-1 opacity-40 group-hover:opacity-100 transition" />
    );
  };

  const sortedMilestoneStats = useMemo(() => {
    return [...milestoneStats].sort((a, b) => {
      let diff = 0;
      switch (pointsSortField) {
        case 'played':
          diff = a.played - b.played;
          break;
        case 'remainingMatches':
          diff = a.remainingMatches - b.remainingMatches;
          break;
        case 'points':
          diff = a.points - b.points;
          break;
        case 'ppg':
          diff = a.ppg - b.ppg;
          break;
        case 'winRate':
          diff = a.winRate - b.winRate;
          break;
        case 'maxPossiblePoints':
          diff = a.maxPossiblePoints - b.maxPossiblePoints;
          break;
        default:
          diff = 0;
      }

      if (diff !== 0) {
        return pointsSortDirection === 'asc' ? diff : -diff;
      }

      // Tiebreakers: Points desc, Max Possible Points desc, Rank asc
      return (
        b.points - a.points ||
        b.maxPossiblePoints - a.maxPossiblePoints ||
        (a.currentRank || 999) - (b.currentRank || 999)
      );
    });
  }, [milestoneStats, pointsSortField, pointsSortDirection]);

  const completedMatchesCount = matches.filter((m) => m.status === 'completed').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Tournament Analytics
              </span>
              <span className="text-slate-500 text-xs hidden xs:inline">•</span>
              <span className="text-slate-400 text-[11px] sm:text-xs font-mono">
                {completedMatchesCount} / {matches.length} Matches Logged
              </span>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>League Records &amp; Statistics</span>
            </h2>
          </div>
        </div>

        {/* 6 Records & Analytics Sub-Tabs - Mobile Optimized with smooth scroll */}
        <div className="mt-3.5 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-800/80 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            id="tab-records-attack"
            onClick={() => setActiveTab('attack')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'attack'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'bg-[#0a0c10] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${activeTab === 'attack' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Attack Rankings</span>
          </button>

          <button
            id="tab-records-defense"
            onClick={() => setActiveTab('defense')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'defense'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                : 'bg-[#0a0c10] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'defense' ? 'text-slate-950' : 'text-cyan-400'}`} />
            <span>Defense rankings</span>
          </button>

          <button
            id="tab-records-highs"
            onClick={() => setActiveTab('highs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'highs'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'bg-[#0a0c10] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${activeTab === 'highs' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Highlight matches</span>
          </button>

          <button
            id="tab-records-streaks"
            onClick={() => setActiveTab('streaks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'streaks'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 font-black'
                : 'bg-[#0a0c10] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <TrendingUp className={`w-3.5 h-3.5 ${activeTab === 'streaks' ? 'text-white' : 'text-rose-400'}`} />
            <span>Form &amp; Streaks</span>
          </button>

          <button
            id="tab-records-efficiency"
            onClick={() => setActiveTab('efficiency')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'efficiency'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                : 'bg-[#0a0c10] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Target className={`w-3.5 h-3.5 ${activeTab === 'efficiency' ? 'text-slate-950' : 'text-cyan-400'}`} />
            <span>Efficiency</span>
          </button>

          <button
            id="tab-records-points"
            onClick={() => setActiveTab('points')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'points'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 font-black'
                : 'bg-[#0a0c10] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Trophy className={`w-3.5 h-3.5 ${activeTab === 'points' ? 'text-white' : 'text-indigo-400'}`} />
            <span>Points Ceiling</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ATTACK RANKINGS */}
      {/* ========================================================================= */}
      {activeTab === 'attack' && (
        <AttackRankingView
          attackStats={attackStats}
          onSelectTeam={onSelectTeam}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. DEFENCE RANKINGS */}
      {/* ========================================================================= */}
      {activeTab === 'defense' && (
        <DefenseRankingView
          defenseStats={defenseStats}
          onSelectTeam={onSelectTeam}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. MATCH HIGHS & THRILLERS */}
      {/* ========================================================================= */}
      {activeTab === 'highs' && (
        <div className="space-y-4 sm:space-y-6">
          {/* 4-Grid Breakdown of Highs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* 1A. Highest Scoring Games */}
            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Highest Scoring Matches (Total Goals)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Thrillers</span>
              </div>

              <div className="space-y-2">
                {matchHighs.highestScoring.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">No completed matches yet.</div>
                ) : (
                  (expandedHighs.highestScoring
                    ? matchHighs.highestScoring
                    : matchHighs.highestScoring.slice(0, 1)
                  ).map((stat) => (
                    <div
                      key={`high-${stat.match.id}`}
                      onClick={() => onViewMatchDetail && onViewMatchDetail(stat.match)}
                      className="p-2.5 rounded-lg bg-[#0a0c10] border border-slate-800/80 hover:border-amber-500/40 hover:bg-[#121620] transition flex items-center justify-between gap-2 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                          stat.rank === 1 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                        }`}>
                          #{stat.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          {/* Mobile View: Logos only with score */}
                          <div className="flex items-center gap-2 sm:hidden py-0.5">
                            <TeamLogo team={stat.homeTeam} size="md" className="w-10 h-10 min-w-10" />
                            <span className="text-amber-400 font-mono font-black px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20 text-xs leading-none shrink-0">
                              {stat.scoreString}
                            </span>
                            <TeamLogo team={stat.awayTeam} size="md" className="w-10 h-10 min-w-10" />
                          </div>

                          {/* Desktop View: Logos + Names with score */}
                          <div className="hidden sm:flex items-center gap-2 text-xs text-white font-medium">
                            <TeamLogo team={stat.homeTeam} size="xs" />
                            <span className="text-slate-200 font-bold max-w-[120px] truncate">{stat.homeTeam.clubName}</span>
                            <span className="text-amber-400 font-mono font-black px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20 text-xs shrink-0">
                              {stat.scoreString}
                            </span>
                            <span className="text-slate-200 font-bold max-w-[120px] truncate">{stat.awayTeam.clubName}</span>
                            <TeamLogo team={stat.awayTeam} size="xs" />
                          </div>

                          {/* Mobile Subtitle: Player names only */}
                          <div className="text-[10px] text-slate-400 font-mono truncate mt-1 sm:hidden">
                            MD {stat.round} • <span className="text-slate-300">{stat.homeTeam.managerName}</span> vs <span className="text-slate-300">{stat.awayTeam.managerName}</span>
                          </div>

                          {/* Desktop Subtitle: Team names with Player names */}
                          <div className="text-[10px] text-slate-400 font-mono truncate mt-1 hidden sm:block">
                            MD {stat.round} • <span className="text-slate-300 font-medium">{stat.homeTeam.clubName}</span> ({stat.homeTeam.managerName}) vs <span className="text-slate-300 font-medium">{stat.awayTeam.clubName}</span> ({stat.awayTeam.managerName})
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-black text-[11px] sm:text-xs">
                          {stat.metricLabel}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {matchHighs.highestScoring.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleHighsCategory('highestScoring')}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#0a0c10] hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/30 text-slate-300 hover:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99]"
                >
                  {expandedHighs.highestScoring ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View {matchHighs.highestScoring.length - 1} more matches</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 1B. Biggest Margin of Victory (Blowouts) */}
            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 text-rose-400 font-bold text-xs sm:text-sm">
                  <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Biggest Margin of Victory (Blowouts)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Blowouts</span>
              </div>

              <div className="space-y-2">
                {matchHighs.biggestWins.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">No completed matches yet.</div>
                ) : (
                  (expandedHighs.biggestWins
                    ? matchHighs.biggestWins
                    : matchHighs.biggestWins.slice(0, 1)
                  ).map((stat) => {
                    const isHomeWinner = (stat.match.homeScore ?? 0) > (stat.match.awayScore ?? 0);
                    const winner = isHomeWinner ? stat.homeTeam : stat.awayTeam;
                    const loser = isHomeWinner ? stat.awayTeam : stat.homeTeam;

                    return (
                      <div
                        key={`win-${stat.match.id}`}
                        onClick={() => onViewMatchDetail && onViewMatchDetail(stat.match)}
                        className="p-2.5 rounded-lg bg-[#0a0c10] border border-slate-800/80 hover:border-rose-500/40 hover:bg-[#121620] transition flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                            stat.rank === 1 ? 'bg-rose-500 text-white font-black' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{stat.rank}
                          </span>
                          <div className="min-w-0 flex-1">
                            {/* Mobile View: Logos only with score */}
                            <div className="flex items-center gap-2 sm:hidden py-0.5">
                              <TeamLogo team={stat.homeTeam} size="md" className="w-10 h-10 min-w-10" />
                              <span className="text-rose-400 font-mono font-black px-2 py-1 bg-rose-500/10 rounded border border-rose-500/20 text-xs leading-none shrink-0">
                                {stat.scoreString}
                              </span>
                              <TeamLogo team={stat.awayTeam} size="md" className="w-10 h-10 min-w-10" />
                            </div>

                            {/* Desktop View: Logos + Names with score */}
                            <div className="hidden sm:flex items-center gap-2 text-xs text-white font-medium">
                              <TeamLogo team={stat.homeTeam} size="xs" />
                              <span className={`max-w-[120px] truncate ${isHomeWinner ? 'text-rose-300 font-bold' : 'text-slate-300'}`}>
                                {stat.homeTeam.clubName}
                              </span>
                              <span className="text-rose-400 font-mono font-black px-1.5 py-0.5 bg-rose-500/10 rounded border border-rose-500/20 text-xs shrink-0">
                                {stat.scoreString}
                              </span>
                              <span className={`max-w-[120px] truncate ${!isHomeWinner ? 'text-rose-300 font-bold' : 'text-slate-300'}`}>
                                {stat.awayTeam.clubName}
                              </span>
                              <TeamLogo team={stat.awayTeam} size="xs" />
                            </div>

                            {/* Mobile Subtitle: Player names only */}
                            <div className="text-[10px] text-slate-400 font-mono truncate mt-1 sm:hidden">
                              MD {stat.round} • <span className="text-rose-400 font-bold">{winner.managerName}</span> def. <span className="text-slate-300">{loser.managerName}</span>
                            </div>

                            {/* Desktop Subtitle: Team names with Player names */}
                            <div className="text-[10px] text-slate-400 font-mono truncate mt-1 hidden sm:block">
                              MD {stat.round} • <span className="text-rose-400 font-bold">{winner.clubName}</span> ({winner.managerName}) def. <span className="text-slate-300 font-medium">{loser.clubName}</span> ({loser.managerName})
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono font-black text-[11px] sm:text-xs">
                            <span className="sm:hidden">+{stat.primaryValue} {stat.primaryValue === 1 ? 'Goal' : 'Goals'}</span>
                            <span className="hidden sm:inline">{stat.metricLabel}</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-rose-400 transition" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {matchHighs.biggestWins.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleHighsCategory('biggestWins')}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#0a0c10] hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99]"
                >
                  {expandedHighs.biggestWins ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View {matchHighs.biggestWins.length - 1} more matches</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 1C. Most Goals Scored by Single Team */}
            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Single Match Team Scoring Record</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Team Peaks</span>
              </div>

              <div className="space-y-2">
                {matchHighs.highestSingleTeamScores.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">No completed matches yet.</div>
                ) : (
                  (expandedHighs.singleTeam
                    ? matchHighs.highestSingleTeamScores
                    : matchHighs.highestSingleTeamScores.slice(0, 1)
                  ).map((stat, idx) => {
                    const homeTeam = stat.isHome ? stat.scoringTeam : stat.concedingTeam;
                    const awayTeam = stat.isHome ? stat.concedingTeam : stat.scoringTeam;

                    return (
                      <div
                        key={`single-${stat.match.id}-${idx}`}
                        onClick={() => onViewMatchDetail && onViewMatchDetail(stat.match)}
                        className="p-2.5 rounded-lg bg-[#0a0c10] border border-slate-800/80 hover:border-emerald-500/40 hover:bg-[#121620] transition flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                            (stat.rank || idx + 1) === 1 ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{stat.rank || idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            {/* Mobile View: Logos only with score */}
                            <div className="flex items-center gap-2 sm:hidden py-0.5">
                              <TeamLogo team={homeTeam} size="md" className="w-10 h-10 min-w-10" />
                              <span className="text-emerald-400 font-mono font-black px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20 text-xs leading-none shrink-0">
                                {stat.scoreString}
                              </span>
                              <TeamLogo team={awayTeam} size="md" className="w-10 h-10 min-w-10" />
                            </div>

                            {/* Desktop View: Logos + Names with score */}
                            <div className="hidden sm:flex items-center gap-2 text-xs text-white font-medium">
                              <TeamLogo team={homeTeam} size="xs" />
                              <span className={`max-w-[120px] truncate ${stat.isHome ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                                {homeTeam.clubName}
                              </span>
                              <span className="text-emerald-400 font-mono font-black px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 text-xs shrink-0">
                                {stat.scoreString}
                              </span>
                              <span className={`max-w-[120px] truncate ${!stat.isHome ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                                {awayTeam.clubName}
                              </span>
                              <TeamLogo team={awayTeam} size="xs" />
                            </div>

                            {/* Mobile Subtitle: Player names only */}
                            <div className="text-[10px] text-slate-400 font-mono truncate mt-1 sm:hidden">
                              MD {stat.round} • <span className="text-emerald-400 font-bold">{stat.scoringTeam.managerName}</span> vs <span className="text-slate-300">{stat.concedingTeam.managerName}</span>
                            </div>

                            {/* Desktop Subtitle: Team names with Player names */}
                            <div className="text-[10px] text-slate-400 font-mono truncate mt-1 hidden sm:block">
                              MD {stat.round} • <span className="text-emerald-400 font-bold">{stat.scoringTeam.clubName}</span> ({stat.scoringTeam.managerName}) vs <span className="text-slate-300 font-medium">{stat.concedingTeam.clubName}</span> ({stat.concedingTeam.managerName})
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-black text-[11px] sm:text-xs">
                            {stat.goalsScored} Goals
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {matchHighs.highestSingleTeamScores.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleHighsCategory('singleTeam')}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#0a0c10] hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99]"
                >
                  {expandedHighs.singleTeam ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View {matchHighs.highestSingleTeamScores.length - 1} more matches</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 1D. Biggest Away Wins */}
            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 text-cyan-400 font-bold text-xs sm:text-sm">
                  <Castle className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Biggest Away Wins (Road Dominance)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Away Feats</span>
              </div>

              <div className="space-y-2">
                {matchHighs.biggestAwayWins.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">No away wins recorded yet.</div>
                ) : (
                  (expandedHighs.awayWins
                    ? matchHighs.biggestAwayWins
                    : matchHighs.biggestAwayWins.slice(0, 1)
                  ).map((stat) => (
                    <div
                      key={`away-${stat.match.id}`}
                      onClick={() => onViewMatchDetail && onViewMatchDetail(stat.match)}
                      className="p-2.5 rounded-lg bg-[#0a0c10] border border-slate-800/80 hover:border-cyan-500/40 hover:bg-[#121620] transition flex items-center justify-between gap-2 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                          stat.rank === 1 ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                        }`}>
                          #{stat.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          {/* Mobile View: Logos only with score */}
                          <div className="flex items-center gap-2 sm:hidden py-0.5">
                            <TeamLogo team={stat.homeTeam} size="md" className="w-10 h-10 min-w-10" />
                            <span className="text-cyan-400 font-mono font-black px-2 py-1 bg-cyan-500/10 rounded border border-cyan-500/20 text-xs leading-none shrink-0">
                              {stat.scoreString}
                            </span>
                            <TeamLogo team={stat.awayTeam} size="md" className="w-10 h-10 min-w-10" />
                          </div>

                          {/* Desktop View: Logos + Names with score */}
                          <div className="hidden sm:flex items-center gap-2 text-xs text-white font-medium">
                            <TeamLogo team={stat.homeTeam} size="xs" />
                            <span className="text-slate-300 max-w-[120px] truncate">{stat.homeTeam.clubName}</span>
                            <span className="text-cyan-400 font-mono font-black px-1.5 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/20 text-xs shrink-0">
                              {stat.scoreString}
                            </span>
                            <span className="text-cyan-300 font-bold max-w-[120px] truncate">{stat.awayTeam.clubName}</span>
                            <TeamLogo team={stat.awayTeam} size="xs" />
                          </div>

                          {/* Mobile Subtitle: Player names only */}
                          <div className="text-[10px] text-slate-400 font-mono truncate mt-1 sm:hidden">
                            MD {stat.round} • <span className="text-cyan-300 font-bold">{stat.awayTeam.managerName}</span> def. <span className="text-slate-300">{stat.homeTeam.managerName}</span>
                          </div>

                          {/* Desktop Subtitle: Team names with Player names */}
                          <div className="text-[10px] text-slate-400 font-mono truncate mt-1 hidden sm:block">
                            MD {stat.round} • <span className="text-cyan-300 font-bold">{stat.awayTeam.clubName}</span> ({stat.awayTeam.managerName}) def. <span className="text-slate-300 font-medium">{stat.homeTeam.clubName}</span> ({stat.homeTeam.managerName})
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-black text-[11px] sm:text-xs">
                          <span className="sm:hidden">+{stat.primaryValue} {stat.primaryValue === 1 ? 'Goal' : 'Goals'}</span>
                          <span className="hidden sm:inline">{stat.metricLabel}</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {matchHighs.biggestAwayWins.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleHighsCategory('awayWins')}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#0a0c10] hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99]"
                >
                  {expandedHighs.awayWins ? (
                    <>
                      <span>Show less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>View {matchHighs.biggestAwayWins.length - 1} more matches</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Tab 1 Footnote / Description - Mobile First Design */}
          <div className="p-3.5 sm:p-4 bg-[#0f1219] border border-slate-800 rounded-xl space-y-3 shadow-md">
            <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
              <div className="w-5 h-5 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Info className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span>Match Thrillers &amp; Records Guide</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
              <div className="p-2.5 sm:p-3 rounded-lg bg-[#0a0c10] border border-slate-800/90 flex flex-col justify-start">
                <div className="mb-1">
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-[10px] sm:text-[11px]">
                    Highest Scoring
                  </span>
                </div>
                <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                  Fixtures with the highest aggregate goals scored between both clubs.
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg bg-[#0a0c10] border border-slate-800/90 flex flex-col justify-start">
                <div className="mb-1">
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono font-bold text-[10px] sm:text-[11px]">
                    Biggest Margin
                  </span>
                </div>
                <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                  Largest winning goal margins recorded in completed tournament fixtures.
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg bg-[#0a0c10] border border-slate-800/90 flex flex-col justify-start">
                <div className="mb-1">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[10px] sm:text-[11px]">
                    Single Match Peak
                  </span>
                </div>
                <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                  Highest goal tally scored by an individual team in a single 90-minute match.
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg bg-[#0a0c10] border border-slate-800/90 flex flex-col justify-start">
                <div className="mb-1">
                  <span className="inline-block px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-[10px] sm:text-[11px]">
                    Away Dominance
                  </span>
                </div>
                <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                  Largest margin of victory achieved by visiting clubs traveling on the road.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FORM & STREAKS LEADERBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'streaks' && (
        <div className="space-y-4">
          <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Team Streaks &amp; Unbeaten Runs Leaderboard</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Track longest and active win streaks, undefeated stretches, and clean sheet momentum.
                </p>
              </div>
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                {isStreakSortChanged && (
                  <button
                    onClick={resetStreakSort}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-sm"
                    title="Reset to default sorting (Longest Unbeaten Descending)"
                  >
                    <RotateCcw className="w-3 h-3 text-rose-400" />
                    <span>Reset Sort</span>
                  </button>
                )}
                <div className="text-[10px] text-slate-500 font-mono sm:text-right">
                  Scroll horizontally for all metrics &rarr;
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[460px] sm:min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0a0c10]/95 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none backdrop-blur-xs font-mono">
                    {/* Rank # (Sticky Left) */}
                    <th className="py-2.5 sm:py-3 px-1 sm:px-3 text-center w-6 sm:w-10 sticky left-0 z-20 bg-[#0a0c10]">
                      <div className="flex items-center justify-center">
                        <span>#</span>
                      </div>
                    </th>

                    {/* Club / Team (Sticky Left next to Rank - Narrower on Mobile) */}
                    <th className="py-2.5 sm:py-3 px-1.5 sm:px-3.5 min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none sticky left-6 sm:left-10 z-20 bg-[#0a0c10] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <span className="sm:hidden">Club</span>
                        <span className="hidden sm:inline">Club / Team</span>
                      </div>
                    </th>

                    {/* 1. Active Unbeaten */}
                    <th
                      onClick={() => handleStreakSort('currentUnbeatenStreak')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer hover:text-cyan-300 transition group whitespace-nowrap text-cyan-400"
                      title="Current Active Unbeaten Run"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Act Unb</span>
                        <span className="hidden sm:inline">Active Unbeaten</span>
                        {renderStreakSortIcon('currentUnbeatenStreak')}
                      </span>
                    </th>

                    {/* 2. Active Win */}
                    <th
                      onClick={() => handleStreakSort('currentWinStreak')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer hover:text-emerald-300 transition group whitespace-nowrap text-emerald-400"
                      title="Current Active Win Streak"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Act Win</span>
                        <span className="hidden sm:inline">Active Win</span>
                        {renderStreakSortIcon('currentWinStreak')}
                      </span>
                    </th>

                    {/* 3. Longest Unbeaten */}
                    <th
                      onClick={() => handleStreakSort('longestUnbeatenStreak')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer hover:text-amber-200 transition group whitespace-nowrap text-amber-300"
                      title="Longest Undefeated / Unbeaten Run"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Max Unb</span>
                        <span className="hidden sm:inline">Longest Unbeaten</span>
                        {renderStreakSortIcon('longestUnbeatenStreak')}
                      </span>
                    </th>

                    {/* 4. Longest Win */}
                    <th
                      onClick={() => handleStreakSort('longestWinStreak')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer hover:text-white transition group whitespace-nowrap text-rose-300"
                      title="Longest Win Streak"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Max Win</span>
                        <span className="hidden sm:inline">Longest Win</span>
                        {renderStreakSortIcon('longestWinStreak')}
                      </span>
                    </th>

                    {/* 5. Scoring Streak */}
                    <th
                      onClick={() => handleStreakSort('longestScoringStreak')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer hover:text-amber-200 transition group whitespace-nowrap text-amber-300"
                      title="Longest Consecutive Matches with Goals Scored"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Scoring</span>
                        <span className="hidden sm:inline">Scoring Streak</span>
                        {renderStreakSortIcon('longestScoringStreak')}
                      </span>
                    </th>

                    {/* 6. Form */}
                    <th
                      onClick={() => handleStreakSort('form')}
                      className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center cursor-pointer hover:text-white transition group whitespace-nowrap"
                      title="Last 5 Matches Form (Points)"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">L5</span>
                        <span className="hidden sm:inline">Form (L5)</span>
                        {renderStreakSortIcon('form')}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {sortedStreakStats.map((item, idx) => (
                    <tr
                      key={item.team.id}
                      onClick={() => onSelectTeam(item.team)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Rank # (Sticky Left) */}
                      <td className="py-2 sm:py-2.5 px-1 sm:px-3 text-center font-mono font-bold sticky left-0 z-10 bg-[#0f1219] group-hover:bg-[#151a24] transition w-6 sm:w-10">
                        <div className="flex items-center justify-center">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] sm:text-xs ${
                              idx === 0
                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950 font-bold'
                                : idx === 2
                                ? 'bg-amber-700 text-white font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </div>
                      </td>

                      {/* Club / Team (Sticky Left next to Rank - Compact on Mobile) */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-3.5 sticky left-6 sm:left-10 z-10 bg-[#0f1219] group-hover:bg-[#151a24] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80 transition min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none">
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                          <TeamLogo team={item.team} size="table" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-1 truncate text-[11px] sm:text-sm leading-tight">
                              <span className="truncate">{item.team.clubName}</span>
                              {item.currentWinStreak >= 3 && (
                                <span className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono text-[8px] sm:text-[9px] font-black border border-rose-500/40 shrink-0">
                                  🔥{item.currentWinStreak}W
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 truncate leading-tight">{item.team.managerName}</div>
                          </div>
                        </div>
                      </td>

                      {/* 1. Active Unbeaten */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-mono">
                        {item.currentUnbeatenStreak > 0 ? (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 text-[11px] sm:text-xs inline-block whitespace-nowrap">
                            {item.currentUnbeatenStreak} unb
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* 2. Active Win */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-mono">
                        {item.currentWinStreak > 0 ? (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[11px] sm:text-xs inline-block whitespace-nowrap">
                            {item.currentWinStreak}W
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* 3. Longest Unbeaten */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-mono font-bold">
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs inline-block whitespace-nowrap ${
                            item.longestUnbeatenStreak >= 5
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black'
                              : 'text-slate-300'
                          }`}
                        >
                          <span className="sm:hidden">{item.longestUnbeatenStreak}G</span>
                          <span className="hidden sm:inline">
                            {item.longestUnbeatenStreak} {item.longestUnbeatenStreak === 1 ? 'game' : 'games'}
                          </span>
                        </span>
                      </td>

                      {/* 4. Longest Win */}
                      <td className="py-2 sm:py-2.5 px-1 sm:px-2 text-center font-mono font-bold">
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs inline-block whitespace-nowrap ${
                            item.longestWinStreak >= 3
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black'
                              : 'text-slate-300'
                          }`}
                        >
                          <span className="sm:hidden">{item.longestWinStreak}G</span>
                          <span className="hidden sm:inline">
                            {item.longestWinStreak} {item.longestWinStreak === 1 ? 'game' : 'games'}
                          </span>
                        </span>
                      </td>

                      {/* 5. Scoring Streak */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-mono">
                        {item.longestScoringStreak > 0 ? (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] sm:text-xs inline-block whitespace-nowrap font-medium">
                            <span className="sm:hidden">{item.longestScoringStreak}G</span>
                            <span className="hidden sm:inline">
                              {item.longestScoringStreak} {item.longestScoringStreak === 1 ? 'game' : 'games'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* 6. Last 5 Form */}
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          {item.last5Form.length === 0 ? (
                            <span className="text-slate-600 text-[10px]">—</span>
                          ) : (
                            item.last5Form.map((res, i) => (
                              <span
                                key={i}
                                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded flex items-center justify-center text-[8px] sm:text-[9px] font-mono font-black shrink-0 ${
                                  res === 'W'
                                    ? 'bg-emerald-500 text-slate-950'
                                    : res === 'D'
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-rose-500 text-white'
                                }`}
                              >
                                {res}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tab 2 Table Description / Legend - Mobile First Design */}
            <div className="p-3.5 sm:p-4 bg-[#0a0c10] border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                <div className="w-5 h-5 rounded bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Info className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <span>Form &amp; Streaks Metrics Guide</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Active Unbeaten
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Current ongoing run without suffering a defeat.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Active Win
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Current ongoing consecutive match winning run.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Longest Unbeaten
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Longest run of matches without defeat (Wins + Draws).
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Longest Win
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Peak consecutive winning streak achieved in the tournament.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Scoring Streak
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Most consecutive games scoring at least one goal.
                  </p>
                </div>
              </div>

              {/* Form L5 Key - Mobile First Wrap */}
              <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs sm:text-[11px] text-slate-300">
                <span className="font-bold text-white font-mono text-[11px]">Form (L5):</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f1219] border border-slate-800">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500 text-slate-950 font-mono font-bold text-[8px] flex items-center justify-center">W</span>
                  <span className="text-[11px]">Win (3 pts)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f1219] border border-slate-800">
                  <span className="w-3.5 h-3.5 rounded bg-amber-500 text-slate-950 font-mono font-bold text-[8px] flex items-center justify-center">D</span>
                  <span className="text-[11px]">Draw (1 pt)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f1219] border border-slate-800">
                  <span className="w-3.5 h-3.5 rounded bg-rose-500 text-white font-mono font-bold text-[8px] flex items-center justify-center">L</span>
                  <span className="text-[11px]">Loss (0 pts)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. HOME VS AWAY FORTRESS BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'homeaway' && (
        <div className="space-y-4 sm:space-y-5">
          {/* League Overview Metric Cards - Responsive Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 sm:p-3.5 text-center">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Home Win Rate</div>
              <div className="text-base sm:text-xl font-black text-emerald-400 font-mono mt-0.5">
                {homeAwayData.leagueOverview.homeWinPct}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {homeAwayData.leagueOverview.totalHomeWins} Home Wins
              </div>
            </div>

            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 sm:p-3.5 text-center">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Away Win Rate</div>
              <div className="text-base sm:text-xl font-black text-cyan-400 font-mono mt-0.5">
                {homeAwayData.leagueOverview.awayWinPct}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {homeAwayData.leagueOverview.totalAwayWins} Away Wins
              </div>
            </div>

            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 sm:p-3.5 text-center">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Draw Rate</div>
              <div className="text-base sm:text-xl font-black text-amber-400 font-mono mt-0.5">
                {homeAwayData.leagueOverview.drawPct}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {homeAwayData.leagueOverview.totalDraws} Draws
              </div>
            </div>

            <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3 sm:p-3.5 text-center">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Home vs Away Goals</div>
              <div className="text-base sm:text-xl font-black text-white font-mono mt-0.5">
                {homeAwayData.leagueOverview.totalHomeGoals} - {homeAwayData.leagueOverview.totalAwayGoals}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {homeAwayData.leagueOverview.homeGoalsPerMatch} vs {homeAwayData.leagueOverview.awayGoalsPerMatch} / match
              </div>
            </div>
          </div>

          {/* Full Home vs Away Standings Table */}
          <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            {/* Header with Title & Sub-tabs Switcher */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    {homeAwaySubTab === 'home' ? (
                      <Castle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    <span>
                      {homeAwaySubTab === 'home'
                        ? 'Home Fortress Standings'
                        : 'Away Resilience Standings'}
                    </span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    {homeAwaySubTab === 'home'
                      ? 'Official league standings calculated exclusively for matches played at Home.'
                      : 'Official league standings calculated exclusively for matches played on the Road.'}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  {isHomeAwaySortChanged && (
                    <button
                      onClick={resetHomeAwaySort}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-sm"
                      title="Reset to default sorting (Points Descending)"
                    >
                      <RotateCcw className={`w-3 h-3 ${homeAwaySubTab === 'home' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                      <span>Reset Sort</span>
                    </button>
                  )}
                  <div className="text-[10px] text-slate-500 font-mono sm:text-right">
                    Scroll horizontally for all columns &rarr;
                  </div>
                </div>
              </div>

              {/* Sub-tabs Selection */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHomeAwaySubTab('home')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    homeAwaySubTab === 'home'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/40'
                      : 'text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Castle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Home Standings</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    {homeAwayData.leagueOverview.totalHomeWins} Wins
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setHomeAwaySubTab('away')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    homeAwaySubTab === 'away'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/40'
                      : 'text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Away Standings</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                    {homeAwayData.leagueOverview.totalAwayWins} Wins
                  </span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[460px] sm:min-w-[660px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0a0c10]/95 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none backdrop-blur-xs font-mono">
                    {/* Rank # (Sticky Left) */}
                    <th className="py-2.5 sm:py-3 px-1 sm:px-3 text-center w-6 sm:w-10 sticky left-0 z-20 bg-[#0a0c10]">
                      <div className="flex items-center justify-center">
                        <span>#</span>
                      </div>
                    </th>

                    {/* Club / Team (Sticky Left next to Rank - Narrower on Mobile) */}
                    <th className="py-2.5 sm:py-3 px-1.5 sm:px-3.5 min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none sticky left-6 sm:left-10 z-20 bg-[#0a0c10] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <span className="sm:hidden">Club</span>
                        <span className="hidden sm:inline">Club / Team</span>
                      </div>
                    </th>

                    {/* MP */}
                    <th
                      onClick={() => handleHomeAwaySort('played')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer hover:text-white transition group"
                      title="Matches Played"
                    >
                      <span className="inline-flex items-center justify-center">
                        MP {renderHomeAwaySortIcon('played')}
                      </span>
                    </th>

                    {/* W */}
                    <th
                      onClick={() => handleHomeAwaySort('won')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center text-emerald-400 cursor-pointer hover:text-emerald-300 transition group"
                      title="Won"
                    >
                      <span className="inline-flex items-center justify-center">
                        W {renderHomeAwaySortIcon('won')}
                      </span>
                    </th>

                    {/* D */}
                    <th
                      onClick={() => handleHomeAwaySort('drawn')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center text-amber-400 cursor-pointer hover:text-amber-300 transition group"
                      title="Drawn"
                    >
                      <span className="inline-flex items-center justify-center">
                        D {renderHomeAwaySortIcon('drawn')}
                      </span>
                    </th>

                    {/* L */}
                    <th
                      onClick={() => handleHomeAwaySort('lost')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center text-rose-400 cursor-pointer hover:text-rose-300 transition group"
                      title="Lost"
                    >
                      <span className="inline-flex items-center justify-center">
                        L {renderHomeAwaySortIcon('lost')}
                      </span>
                    </th>

                    {/* PTS */}
                    <th
                      onClick={() => handleHomeAwaySort('points')}
                      className={`py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-black cursor-pointer hover:opacity-90 transition group ${
                        homeAwaySubTab === 'home'
                          ? 'bg-emerald-950/30 text-emerald-400'
                          : 'bg-cyan-950/30 text-cyan-400'
                      }`}
                      title="Points"
                    >
                      <span className="inline-flex items-center justify-center">
                        PTS {renderHomeAwaySortIcon('points')}
                      </span>
                    </th>

                    {/* GF */}
                    <th
                      onClick={() => handleHomeAwaySort('goalsFor')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer hover:text-white transition group"
                      title="Goals For"
                    >
                      <span className="inline-flex items-center justify-center">
                        GF {renderHomeAwaySortIcon('goalsFor')}
                      </span>
                    </th>

                    {/* GA */}
                    <th
                      onClick={() => handleHomeAwaySort('goalsAgainst')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer hover:text-white transition group"
                      title="Goals Against"
                    >
                      <span className="inline-flex items-center justify-center">
                        GA {renderHomeAwaySortIcon('goalsAgainst')}
                      </span>
                    </th>

                    {/* GD */}
                    <th
                      onClick={() => handleHomeAwaySort('goalDifference')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer hover:text-white transition group"
                      title="Goal Difference"
                    >
                      <span className="inline-flex items-center justify-center">
                        GD {renderHomeAwaySortIcon('goalDifference')}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {sortedHomeAwayList.map((item, idx) => (
                    <tr
                      key={item.team.id}
                      onClick={() => onSelectTeam(item.team)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Rank # (Sticky Left) */}
                      <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-mono font-bold sticky left-0 z-10 bg-[#0f1219] group-hover:bg-[#151a24] transition w-6 sm:w-10">
                        <div className="flex items-center justify-center">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] sm:text-xs ${
                              idx === 0
                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950 font-bold'
                                : idx === 2
                                ? 'bg-amber-700 text-white font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </div>
                      </td>

                      {/* Club / Team (Sticky Left next to Rank - Compact on Mobile) */}
                      <td className="py-2 sm:py-3 px-1.5 sm:px-3.5 sticky left-6 sm:left-10 z-10 bg-[#0f1219] group-hover:bg-[#151a24] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80 transition min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none">
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                          <TeamLogo team={item.team} size="table" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white group-hover:text-emerald-400 transition truncate text-[11px] sm:text-sm leading-tight">
                              {item.team.clubName}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 truncate leading-tight">{item.team.managerName}</div>
                          </div>
                        </div>
                      </td>

                      {/* MP */}
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-mono text-slate-300 text-xs">
                        {item.stats.played}
                      </td>

                      {/* W */}
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-mono font-bold text-emerald-400 text-xs">
                        {item.stats.won}
                      </td>

                      {/* D */}
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-mono font-bold text-amber-400 text-xs">
                        {item.stats.drawn}
                      </td>

                      {/* L */}
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-mono font-bold text-rose-400 text-xs">
                        {item.stats.lost}
                      </td>

                      {/* PTS */}
                      <td
                        className={`py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono font-black text-xs sm:text-sm ${
                          homeAwaySubTab === 'home'
                            ? 'bg-emerald-950/20 text-emerald-400'
                            : 'bg-cyan-950/20 text-cyan-400'
                        }`}
                      >
                        {item.stats.points}
                      </td>

                      {/* GF */}
                      <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center font-mono text-slate-300 text-xs">
                        {item.stats.goalsFor}
                      </td>

                      {/* GA */}
                      <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center font-mono text-slate-300 text-xs">
                        {item.stats.goalsAgainst}
                      </td>

                      {/* GD */}
                      <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center font-mono font-bold text-slate-200 text-xs">
                        {item.stats.goalDifference > 0
                          ? `+${item.stats.goalDifference}`
                          : item.stats.goalDifference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tab 3 Table Description / Legend - Mobile First Design */}
            <div className="p-3.5 sm:p-4 bg-[#0a0c10] border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                <div className={`w-5 h-5 rounded ${homeAwaySubTab === 'home' ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-cyan-500/15 border-cyan-500/30'} border flex items-center justify-center shrink-0`}>
                  <Info className={`w-3.5 h-3.5 ${homeAwaySubTab === 'home' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                </div>
                <span>
                  {homeAwaySubTab === 'home'
                    ? 'Home Fortress Standings Guide'
                    : 'Away Resilience Standings Guide'}
                </span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg bg-[#0f1219] border border-slate-800/80">
                <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                  {homeAwaySubTab === 'home'
                    ? 'Evaluates team dominance when hosting fixtures at their home ground. Points, wins, goals, and goal difference are tabulated strictly from matches where the team was designated the Home club.'
                    : 'Evaluates team performance and resilience when traveling to opponent stadiums. Points, wins, goals, and goal difference are tabulated strictly from matches where the team was the visiting Away club.'}
                </p>
              </div>

              {/* Column Glossary - Mobile First Badge Grid */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300 font-mono">Column Legend:</div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1219] border border-slate-800 text-slate-300">
                    <strong className="text-white">#</strong> Rank
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1219] border border-slate-800 text-slate-300">
                    <strong className="text-white">MP</strong> Matches
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1219] border border-slate-800 text-slate-300">
                    <strong className="text-emerald-400">W</strong> Won (3 pts)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1219] border border-slate-800 text-slate-300">
                    <strong className="text-amber-400">D</strong> Drawn (1 pt)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1219] border border-slate-800 text-slate-300">
                    <strong className="text-rose-400">L</strong> Lost (0 pts)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1219] border border-slate-800 text-slate-300">
                    <strong className="text-cyan-300 font-bold">PTS</strong> Points
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1219] border border-slate-800 text-slate-300">
                    <strong className="text-white">GF</strong> Scored
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1219] border border-slate-800 text-slate-300">
                    <strong className="text-white">GA</strong> Conceded
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1219] border border-slate-800 text-slate-300">
                    <strong className="text-white">GD</strong> Goal Diff
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OFFENSIVE & DEFENSIVE EFFICIENCY RATES */}
      {/* ========================================================================= */}
      {activeTab === 'efficiency' && (
        <div className="space-y-4">
          <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Offensive &amp; Defensive Efficiency Rates (BTTS / CS / &gt;2.5)</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Statistical likelihood of clean sheets, both teams scoring, high goal volume (&gt;2.5 goals), and shutout defense.
                </p>
              </div>
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                {isEfficiencySortChanged && (
                  <button
                    onClick={resetEfficiencySort}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-sm"
                    title="Reset to default sorting (Clean Sheet % Descending)"
                  >
                    <RotateCcw className="w-3 h-3 text-cyan-400" />
                    <span>Reset Sort</span>
                  </button>
                )}
                <div className="text-[10px] text-slate-500 font-mono sm:text-right">
                  Scroll horizontally for all columns &rarr;
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[460px] sm:min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0a0c10]/95 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none backdrop-blur-xs font-mono">
                    {/* Rank # (Sticky Left) */}
                    <th className="py-2.5 sm:py-3 px-1 sm:px-3 text-center w-6 sm:w-10 sticky left-0 z-20 bg-[#0a0c10]">
                      <div className="flex items-center justify-center">
                        <span>#</span>
                      </div>
                    </th>

                    {/* Club / Team (Sticky Left next to Rank - Narrower on Mobile) */}
                    <th className="py-2.5 sm:py-3 px-1.5 sm:px-3.5 min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none sticky left-6 sm:left-10 z-20 bg-[#0a0c10] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <span className="sm:hidden">Club</span>
                        <span className="hidden sm:inline">Club / Team</span>
                      </div>
                    </th>
                    <th
                      onClick={() => handleEfficiencySort('matchesPlayed')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer select-none hover:text-white transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">P</span>
                        <span className="hidden sm:inline">Played</span>
                        {renderEfficiencySortIcon('matchesPlayed')}
                      </span>
                    </th>
                    <th
                      onClick={() => handleEfficiencySort('cleanSheetPct')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center text-cyan-300 cursor-pointer select-none hover:text-cyan-200 transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">CS %</span>
                        <span className="hidden sm:inline">Clean Sheet % (CS)</span>
                        {renderEfficiencySortIcon('cleanSheetPct')}
                      </span>
                    </th>
                    <th
                      onClick={() => handleEfficiencySort('bttsPct')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center text-amber-300 cursor-pointer select-none hover:text-amber-200 transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">BTTS %</span>
                        <span className="hidden sm:inline">Both Scored (BTTS)</span>
                        {renderEfficiencySortIcon('bttsPct')}
                      </span>
                    </th>
                    <th
                      onClick={() => handleEfficiencySort('over25Pct')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center text-emerald-300 cursor-pointer select-none hover:text-emerald-200 transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">&gt;2.5 %</span>
                        <span className="hidden sm:inline">Over 2.5 Goals</span>
                        {renderEfficiencySortIcon('over25Pct')}
                      </span>
                    </th>
                    <th
                      onClick={() => handleEfficiencySort('failedToScorePct')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center text-rose-300 cursor-pointer select-none hover:text-rose-200 transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">FTS %</span>
                        <span className="hidden sm:inline">Failed to Score (FTS)</span>
                        {renderEfficiencySortIcon('failedToScorePct')}
                      </span>
                    </th>
                    <th
                      onClick={() => handleEfficiencySort('goalDominanceRatio')}
                      className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center text-indigo-300 cursor-pointer select-none hover:text-indigo-200 transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Ratio</span>
                        <span className="hidden sm:inline">Dominance (GF:GA)</span>
                        {renderEfficiencySortIcon('goalDominanceRatio')}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {sortedEfficiencyStats.map((item, idx) => (
                    <tr
                      key={item.team.id}
                      onClick={() => onSelectTeam(item.team)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Rank # (Sticky Left) */}
                      <td className="py-2 sm:py-2.5 px-1 sm:px-3 text-center font-mono font-bold sticky left-0 z-10 bg-[#0f1219] group-hover:bg-[#151a24] transition w-6 sm:w-10">
                        <div className="flex items-center justify-center">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] sm:text-xs ${
                              idx === 0
                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950 font-bold'
                                : idx === 2
                                ? 'bg-amber-700 text-white font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </div>
                      </td>

                      {/* Club / Team (Sticky Left next to Rank - Compact on Mobile) */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-3.5 sticky left-6 sm:left-10 z-10 bg-[#0f1219] group-hover:bg-[#151a24] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80 transition min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none">
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                          <TeamLogo team={item.team} size="table" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white group-hover:text-emerald-400 transition truncate text-[11px] sm:text-sm leading-tight">
                              {item.team.clubName}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 truncate leading-tight">{item.team.managerName}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-mono text-slate-300 text-[11px] sm:text-xs">
                        {item.matchesPlayed}
                      </td>

                      {/* Clean Sheet % */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-mono">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-[11px] sm:text-xs inline-block whitespace-nowrap">
                          {item.cleanSheets} ({item.cleanSheetPct}%)
                        </span>
                      </td>

                      {/* BTTS % */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-mono">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px] sm:text-xs inline-block whitespace-nowrap">
                          {item.bttsCount} ({item.bttsPct}%)
                        </span>
                      </td>

                      {/* Over 2.5 Goals % */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-mono">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] sm:text-xs inline-block whitespace-nowrap">
                          {item.over25Count} ({item.over25Pct}%)
                        </span>
                      </td>

                      {/* Failed to score % */}
                      <td className="py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-mono">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-[11px] sm:text-xs inline-block whitespace-nowrap">
                          {item.failedToScoreCount} ({item.failedToScorePct}%)
                        </span>
                      </td>

                      {/* Goal Dominance GF / GA */}
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center font-mono font-bold text-indigo-300 text-[11px] sm:text-xs whitespace-nowrap">
                        {item.goalsFor}:{item.goalsAgainst} ({item.goalDominanceRatio.toFixed(2)}x)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tab 4 Table Description / Legend - Mobile First Design */}
            <div className="p-3.5 sm:p-4 bg-[#0a0c10] border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                <div className="w-5 h-5 rounded bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span>Efficiency &amp; Propensity Rates Guide</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Clean Sheet % (CS)
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Percentage of matches where the team conceded zero goals.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Both Scored (BTTS)
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Percentage of matches where both clubs scored &ge;1 goal.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      &gt;2.5 Goals %
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Percentage of fixtures producing 3 or more combined total goals.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Failed to Score (FTS)
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Percentage of fixtures where the team was shut out (0 goals scored).
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80 sm:col-span-2">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Dominance Ratio (GF:GA)
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Ratio of total goals scored to conceded. A ratio &gt;1.0 denotes a positive attacking-to-defensive balance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. POINTS CONVERSION & MATHEMATICAL CEILING */}
      {/* ========================================================================= */}
      {activeTab === 'points' && (
        <div className="space-y-4">
          <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Points Conversion &amp; Maximum Points Ceiling</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Highest possible points ceiling if a club wins 100% of remaining scheduled matches (40 matches total).
                </p>
              </div>
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                {isPointsSortChanged && (
                  <button
                    onClick={resetPointsSort}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-medium transition cursor-pointer active:scale-95 shadow-sm"
                    title="Reset to default sorting (Points Descending)"
                  >
                    <RotateCcw className="w-3 h-3 text-emerald-400" />
                    <span>Reset Sort</span>
                  </button>
                )}
                <div className="text-[10px] text-slate-500 font-mono sm:text-right">
                  Scroll horizontally for all columns &rarr;
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[460px] sm:min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0a0c10]/95 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none backdrop-blur-xs font-mono">
                    {/* Rank # (Sticky Left) */}
                    <th className="py-2.5 sm:py-3 px-1 sm:px-3 text-center w-6 sm:w-10 sticky left-0 z-20 bg-[#0a0c10]">
                      <div className="flex items-center justify-center">
                        <span>#</span>
                      </div>
                    </th>

                    {/* Club / Team (Sticky Left next to Rank - Narrower on Mobile) */}
                    <th className="py-2.5 sm:py-3 px-1.5 sm:px-3.5 min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none sticky left-6 sm:left-10 z-20 bg-[#0a0c10] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <span className="sm:hidden">Club</span>
                        <span className="hidden sm:inline">Club / Team</span>
                      </div>
                    </th>
                    <th
                      onClick={() => handlePointsSort('played')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer select-none hover:text-white transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">P</span>
                        <span className="hidden sm:inline">Played</span>
                        {renderPointsSortIcon('played')}
                      </span>
                    </th>
                    <th
                      onClick={() => handlePointsSort('remainingMatches')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer select-none hover:text-white transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Rem</span>
                        <span className="hidden sm:inline">Remaining</span>
                        {renderPointsSortIcon('remainingMatches')}
                      </span>
                    </th>
                    <th
                      onClick={() => handlePointsSort('points')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center font-bold text-emerald-400 cursor-pointer select-none hover:text-emerald-300 transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Pts</span>
                        <span className="hidden sm:inline">Current Pts</span>
                        {renderPointsSortIcon('points')}
                      </span>
                    </th>
                    <th
                      onClick={() => handlePointsSort('ppg')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center cursor-pointer select-none hover:text-white transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        PPG {renderPointsSortIcon('ppg')}
                      </span>
                    </th>
                    <th
                      onClick={() => handlePointsSort('winRate')}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 text-center text-amber-300 cursor-pointer select-none hover:text-amber-200 transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Win %</span>
                        <span className="hidden sm:inline">Win Rate</span>
                        {renderPointsSortIcon('winRate')}
                      </span>
                    </th>
                    <th
                      onClick={() => handlePointsSort('maxPossiblePoints')}
                      className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-bold text-indigo-300 cursor-pointer select-none hover:text-indigo-200 transition group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center">
                        <span className="sm:hidden">Max Pts</span>
                        <span className="hidden sm:inline">Max Possible Pts Ceiling</span>
                        {renderPointsSortIcon('maxPossiblePoints')}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {sortedMilestoneStats.map((item, idx) => (
                    <tr
                      key={item.team.id}
                      onClick={() => onSelectTeam(item.team)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Rank # (Sticky Left) */}
                      <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-mono font-bold sticky left-0 z-10 bg-[#0f1219] group-hover:bg-[#151a24] transition w-6 sm:w-10">
                        <div className="flex items-center justify-center">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] sm:text-xs ${
                              idx === 0
                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950 font-bold'
                                : idx === 2
                                ? 'bg-amber-700 text-white font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </div>
                      </td>

                      {/* Club Column (Sticky Left next to Rank - Compact on Mobile) */}
                      <td className="py-2 sm:py-3 px-1.5 sm:px-3.5 sticky left-6 sm:left-10 z-10 bg-[#0f1219] group-hover:bg-[#151a24] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80 transition min-w-[88px] max-w-[105px] sm:min-w-[200px] sm:max-w-none">
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                          <TeamLogo team={item.team} size="table" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white group-hover:text-emerald-400 transition truncate text-[11px] sm:text-sm leading-tight">
                              {item.team.clubName}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 truncate leading-tight">{item.team.managerName}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-mono text-slate-300 text-xs">{item.played}</td>
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-mono text-slate-400 text-xs">{item.remainingMatches}</td>

                      {/* Current Points */}
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-mono font-black text-xs sm:text-sm text-emerald-400">
                        {item.points}
                      </td>

                      {/* PPG */}
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-mono text-slate-300 text-xs">
                        {item.ppg.toFixed(2)}
                      </td>

                      {/* Win Rate */}
                      <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-mono text-amber-300 font-bold text-xs">
                        {item.winRate}%
                      </td>

                      {/* Max Possible Points */}
                      <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono">
                        <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-black text-[10px] sm:text-xs whitespace-nowrap">
                          {item.maxPossiblePoints} PTS
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tab 5 Table Description / Legend - Mobile First Design */}
            <div className="p-3.5 sm:p-4 bg-[#0a0c10] border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                <div className="w-5 h-5 rounded bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span>Points Projection &amp; Title Ceiling Guide</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Played &amp; Remaining
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Completed fixtures vs remaining matches scheduled (40 matches total per club).
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Current Pts &amp; PPG
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Total accumulated league points and average Points Per Game scoring pace.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Win Rate %
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed">
                    Percentage of completed tournament fixtures resulting in a victory.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0f1219] border border-slate-800/80 sm:col-span-2 lg:col-span-3">
                  <div className="mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-[10px] sm:text-[11px]">
                      Max Possible Points Ceiling
                    </span>
                  </div>
                  <p className="text-slate-300 sm:text-slate-400 text-xs sm:text-[11px] leading-relaxed mb-2">
                    The mathematical maximum points achievable if a club wins 100% of all remaining matches. Used to determine championship elimination thresholds.
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0a0c10] border border-slate-800 text-[10px] sm:text-[11px] font-mono text-indigo-300">
                    <span className="text-slate-400">Formula:</span>
                    <span>Pts + (Remaining &times; 3)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
