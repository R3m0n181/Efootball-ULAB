import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  LayoutList,
  TableProperties,
  Info,
  Trophy,
  Scale,
  Calendar,
  Shield,
  Activity,
  CheckCircle2,
  HelpCircle,
  Menu,
  Check,
  X,
} from 'lucide-react';
import { StandingsRow, Team, Match, TournamentConfig } from '../types';
import { TeamLogo } from './TeamLogo';
import { calculateStandings } from '../utils/calculations';

interface StandingsTableProps {
  standings: StandingsRow[];
  teams?: Team[];
  matches?: Match[];
  config?: TournamentConfig;
  onSelectTeam: (team: Team) => void;
  onOpenSubmitModal: () => void;
  isAdmin?: boolean;
}

export type SortField =
  | 'rank'
  | 'club'
  | 'played'
  | 'won'
  | 'drawn'
  | 'lost'
  | 'points'
  | 'goalsFor'
  | 'goalsAgainst'
  | 'goalDifference'
  | 'cleanSheets';

export const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  teams,
  matches,
  config,
  onSelectTeam,
  onOpenSubmitModal,
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [venueFilter, setVenueFilter] = useState<'all' | 'home' | 'away'>('all');
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // Track if user manually switched mode
  const [userSelectedMode, setUserSelectedMode] = useState<boolean>(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  
  // Default to 'detailed' on tablet/desktop viewports (>= 640px), 'basic' on mobile (< 640px)
  const [viewMode, setViewMode] = useState<'basic' | 'detailed'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 640 ? 'detailed' : 'basic';
    }
    return 'basic';
  });

  useEffect(() => {
    const handleResize = () => {
      if (!userSelectedMode && typeof window !== 'undefined') {
        const isDesktopOrTablet = window.innerWidth >= 640;
        setViewMode(isDesktopOrTablet ? 'detailed' : 'basic');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userSelectedMode]);

  // Close options menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        optionsMenuRef.current &&
        !optionsMenuRef.current.contains(event.target as Node)
      ) {
        setIsOptionsMenuOpen(false);
      }
    };

    if (isOptionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOptionsMenuOpen]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default direction for new sort selection
      if (field === 'rank' || field === 'club') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const resetToDefaultSort = () => {
    setSortField('points');
    setSortDirection('desc');
  };

  const isDefaultSort = sortField === 'points' && sortDirection === 'desc';

  // Compute standings based on active venue filter (All, Home, Away)
  const activeStandings = useMemo(() => {
    if (venueFilter === 'all' || !teams || !matches || !config) {
      if (venueFilter !== 'all' && teams && matches && config) {
        return calculateStandings(teams, matches, config, venueFilter);
      }
      return standings;
    }
    return calculateStandings(teams, matches, config, venueFilter);
  }, [standings, teams, matches, config, venueFilter]);

  const filteredAndSortedStandings = useMemo(() => {
    const filtered = activeStandings.filter((row) => {
      const matchSearch =
        row.team.clubName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.team.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.team.shortCode.toLowerCase().includes(searchTerm.toLowerCase());

      return matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let compare = 0;

      switch (sortField) {
        case 'rank':
          compare = a.rank - b.rank;
          break;
        case 'club':
          compare = a.team.clubName.localeCompare(b.team.clubName);
          break;
        case 'played':
          compare = a.played - b.played;
          break;
        case 'won':
          compare = a.won - b.won;
          break;
        case 'drawn':
          compare = a.drawn - b.drawn;
          break;
        case 'lost':
          compare = a.lost - b.lost;
          break;
        case 'points':
          compare = a.points - b.points;
          break;
        case 'goalsFor':
          compare = a.goalsFor - b.goalsFor;
          break;
        case 'goalsAgainst':
          compare = a.goalsAgainst - b.goalsAgainst;
          break;
        case 'goalDifference':
          compare = a.goalDifference - b.goalDifference;
          break;
        case 'cleanSheets':
          compare = a.cleanSheets - b.cleanSheets;
          break;
        default:
          compare = 0;
      }

      if (compare !== 0) {
        return sortDirection === 'asc' ? compare : -compare;
      }

      // Tiebreaker fallback: default official league rank order
      return a.rank - b.rank;
    });
  }, [activeStandings, searchTerm, sortField, sortDirection]);

  // Helper component to render sort icon on table headers
  const renderSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0 inline-block ml-1" />
      ) : (
        <ArrowDown className="w-3 h-3 text-emerald-400 shrink-0 inline-block ml-1" />
      );
    }
    return (
      <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-40 group-hover/th:opacity-100 group-hover/th:text-slate-200 transition shrink-0 inline-block ml-1" />
    );
  };

  return (
    <div id="standings-table-container" className="space-y-3">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0f1219] p-2.5 rounded-xl border border-slate-800">
        {/* Left: Venue Filter Tabs & Options Hamburger Menu */}
        <div className="flex items-center gap-2">
          {/* Venue Tabs: All, Home, Away */}
          <div className="inline-flex items-center p-1 bg-[#0a0c10] rounded-xl border border-slate-800 shadow-inner">
            <button
              id="standings-venue-all-btn"
              onClick={() => setVenueFilter('all')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                venueFilter === 'all'
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              All
            </button>
            <button
              id="standings-venue-home-btn"
              onClick={() => setVenueFilter('home')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                venueFilter === 'home'
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Home
            </button>
            <button
              id="standings-venue-away-btn"
              onClick={() => setVenueFilter('away')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                venueFilter === 'away'
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Away
            </button>
          </div>

          {/* Options Dropdown Menu Button (Hamburger Only) */}
          <div className="relative" ref={optionsMenuRef}>
            <button
              id="standings-table-options-btn"
              type="button"
              onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
              aria-label="Table view options"
              title="Table view options (Basic / Detailed)"
              className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                isOptionsMenuOpen
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                  : 'bg-[#0a0c10] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Mobile Backdrop & Dropdown Popover */}
            {isOptionsMenuOpen && (
              <div id="standings-options-menu-container">
                {/* Backdrop for easy click/touch dismiss on mobile */}
                <div
                  className="fixed inset-0 z-40 bg-black/60 sm:hidden backdrop-blur-xs animate-in fade-in duration-150"
                  onClick={() => setIsOptionsMenuOpen(false)}
                  aria-hidden="true"
                />

                {/* Popover Card (Modal-like centered bottom sheet on mobile, clean dropdown on sm+) */}
                <div className="fixed sm:absolute left-4 right-4 sm:left-0 sm:right-auto bottom-6 sm:bottom-auto sm:top-full sm:mt-1.5 sm:w-64 bg-[#121622] border border-slate-700/80 rounded-2xl sm:rounded-xl shadow-2xl z-50 p-3 sm:p-2 space-y-1.5 sm:space-y-1 animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-top-1 duration-150 backdrop-blur-md">
                  <div className="px-2 py-1 text-xs sm:text-[10px] font-bold uppercase tracking-wider text-slate-300 sm:text-slate-400 border-b border-slate-800 pb-2 sm:pb-1.5 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Menu className="w-3.5 h-3.5 text-emerald-400 sm:hidden" />
                      <span>Table Display Mode</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold uppercase">
                        Active: {viewMode}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOptionsMenuOpen(false)}
                        className="sm:hidden p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="opt-view-basic"
                    onClick={() => {
                      setViewMode('basic');
                      setUserSelectedMode(true);
                      setIsOptionsMenuOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 sm:gap-2.5 p-3 sm:p-2 rounded-xl sm:rounded-lg text-left transition cursor-pointer active:scale-[0.99] ${
                      viewMode === 'basic'
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-white shadow-sm'
                        : 'hover:bg-slate-800/80 border border-transparent text-slate-300'
                    }`}
                  >
                    <LayoutList
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        viewMode === 'basic' ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-xs font-bold">Basic Table</span>
                        {viewMode === 'basic' && (
                          <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs sm:text-[10px] text-slate-400 leading-tight mt-0.5">
                        Streamlined columns (Pos, Club, P, GD, Pts, Form)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="opt-view-detailed"
                    onClick={() => {
                      setViewMode('detailed');
                      setUserSelectedMode(true);
                      setIsOptionsMenuOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 sm:gap-2.5 p-3 sm:p-2 rounded-xl sm:rounded-lg text-left transition cursor-pointer active:scale-[0.99] ${
                      viewMode === 'detailed'
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-white shadow-sm'
                        : 'hover:bg-slate-800/80 border border-transparent text-slate-300'
                    }`}
                  >
                    <TableProperties
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        viewMode === 'detailed' ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-xs font-bold">Detailed Table</span>
                        {viewMode === 'detailed' && (
                          <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs sm:text-[10px] text-slate-400 leading-tight mt-0.5">
                        Full statistics (W, D, L, GF, GA, Win%, PPG)
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Search & Reset Sort */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-xs md:max-w-sm justify-end">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="standings-search-input"
              type="text"
              placeholder={
                venueFilter === 'all'
                  ? 'Search club or manager...'
                  : `Search ${venueFilter} standings...`
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0a0c10] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {!isDefaultSort && (
            <button
              onClick={resetToDefaultSort}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0"
              title="Reset sorting to Points"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Standings Table Card */}
      <div className="bg-[#0f1219] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0a0c10]/95 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none backdrop-blur-xs">
                {/* Rank # (Sticky Left) */}
                <th className="py-2.5 px-2 sm:px-3 text-center w-8 sm:w-10 sticky left-0 z-20 bg-[#0a0c10]">
                  <div className="flex items-center justify-center">
                    <span>#</span>
                  </div>
                </th>

                {/* Club / Team (Sticky Left next to Rank) */}
                <th className="py-2.5 px-2.5 sm:px-3.5 min-w-[140px] sm:min-w-[200px] sticky left-8 sm:left-10 z-20 bg-[#0a0c10] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80">
                  <div className="flex items-center gap-1">
                    <span>Club / Team</span>
                  </div>
                </th>

                {/* MP */}
                <th
                  onClick={() => handleSort('played')}
                  className="py-2.5 px-1.5 sm:px-2 text-center cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Matches Played (MP)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'played' ? 'text-emerald-400 font-black' : ''}>MP</span>
                    {renderSortIndicator('played')}
                  </div>
                </th>

                {/* If Detailed: W, D, L */}
                {viewMode === 'detailed' && (
                  <th
                    onClick={() => handleSort('won')}
                    className="py-2.5 px-1.5 sm:px-2 text-center text-emerald-400 cursor-pointer group/th hover:bg-slate-800/60 transition"
                    title="Sort by Wins (W)"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span className={sortField === 'won' ? 'font-black' : ''}>W</span>
                      {renderSortIndicator('won')}
                    </div>
                  </th>
                )}
                {viewMode === 'detailed' && (
                  <th
                    onClick={() => handleSort('drawn')}
                    className="py-2.5 px-1.5 sm:px-2 text-center text-amber-400 cursor-pointer group/th hover:bg-slate-800/60 transition"
                    title="Sort by Draws (D)"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span className={sortField === 'drawn' ? 'font-black' : ''}>D</span>
                      {renderSortIndicator('drawn')}
                    </div>
                  </th>
                )}
                {viewMode === 'detailed' && (
                  <th
                    onClick={() => handleSort('lost')}
                    className="py-2.5 px-1.5 sm:px-2 text-center text-rose-400 cursor-pointer group/th hover:bg-slate-800/60 transition"
                    title="Sort by Losses (L)"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span className={sortField === 'lost' ? 'font-black' : ''}>L</span>
                      {renderSortIndicator('lost')}
                    </div>
                  </th>
                )}

                {/* Points (PTS) */}
                <th
                  onClick={() => handleSort('points')}
                  className="py-2.5 px-2 sm:px-3 text-center text-emerald-400 font-black cursor-pointer group/th hover:bg-slate-800/60 transition bg-emerald-950/20"
                  title="Sort by Points (PTS) - Default"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'points' ? 'underline decoration-emerald-400/60 underline-offset-2' : ''}>PTS</span>
                    {renderSortIndicator('points')}
                  </div>
                </th>

                {/* If Detailed: GF, GA */}
                {viewMode === 'detailed' && (
                  <th
                    onClick={() => handleSort('goalsFor')}
                    className="py-2.5 px-1.5 sm:px-2 text-center cursor-pointer group/th hover:bg-slate-800/60 transition"
                    title="Sort by Goals For (GF)"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span className={sortField === 'goalsFor' ? 'text-emerald-400 font-black' : ''}>GF</span>
                      {renderSortIndicator('goalsFor')}
                    </div>
                  </th>
                )}
                {viewMode === 'detailed' && (
                  <th
                    onClick={() => handleSort('goalsAgainst')}
                    className="py-2.5 px-1.5 sm:px-2 text-center cursor-pointer group/th hover:bg-slate-800/60 transition"
                    title="Sort by Goals Against (GA)"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span className={sortField === 'goalsAgainst' ? 'text-emerald-400 font-black' : ''}>GA</span>
                      {renderSortIndicator('goalsAgainst')}
                    </div>
                  </th>
                )}

                {/* GD */}
                <th
                  onClick={() => handleSort('goalDifference')}
                  className="py-2.5 px-1.5 sm:px-2 text-center cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Goal Difference (GD)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'goalDifference' ? 'text-emerald-400 font-black' : ''}>GD</span>
                    {renderSortIndicator('goalDifference')}
                  </div>
                </th>

                {/* CS */}
                <th
                  onClick={() => handleSort('cleanSheets')}
                  className="py-2.5 px-1.5 sm:px-2 text-center text-cyan-400/90 cursor-pointer group/th hover:bg-slate-800/60 transition"
                  title="Sort by Clean Sheets (CS)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span className={sortField === 'cleanSheets' ? 'text-cyan-300 font-black' : ''}>CS</span>
                    {renderSortIndicator('cleanSheets')}
                  </div>
                </th>

                {/* Form */}
                <th className="py-2.5 px-2 sm:px-3 min-w-[90px] sm:min-w-[120px] text-center">Form</th>

                {/* Details */}
                <th className="py-2.5 px-1.5 sm:px-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredAndSortedStandings.map((row, index) => {
                const position = index + 1;
                return (
                  <tr
                    key={row.team.id}
                    onClick={() => onSelectTeam(row.team)}
                    className={`group transition hover:bg-slate-800/50 cursor-pointer ${
                      position === 1 ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Rank / Fixed Position (Sticky on scroll) */}
                    <td className="py-2 px-2 text-center font-mono font-bold sticky left-0 z-10 bg-[#0f1219] group-hover:bg-[#151a24] transition">
                      <div className="flex items-center justify-center">
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                            position === 1
                              ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                              : position === 2
                              ? 'bg-slate-300 text-slate-950 font-bold'
                              : position === 3
                              ? 'bg-amber-700 text-white font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {position}
                        </span>
                      </div>
                    </td>

                    {/* Club (Top) & Manager (Below) - Sticky Left next to Rank */}
                    <td className="py-2 px-2.5 sm:px-3.5 sticky left-8 sm:left-10 z-10 bg-[#0f1219] group-hover:bg-[#151a24] shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800/80 transition">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        {/* Official Club Crest */}
                        <TeamLogo team={row.team} size="table" />

                        <div className="min-w-0">
                          {/* Team name first (Prominent) */}
                          <div className="font-bold text-white group-hover:text-emerald-400 transition truncate text-xs sm:text-sm">
                            {row.team.clubName}
                          </div>
                          {/* Player name below */}
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span className="font-medium text-slate-400 truncate">{row.team.managerName}</span>
                            <span className="text-slate-600 shrink-0">•</span>
                            <span className="font-mono text-[10px] text-slate-500 uppercase shrink-0">
                              {row.team.shortCode}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* MP */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono font-medium text-slate-300">
                      {row.played}
                    </td>

                    {/* If Detailed: Won, Drawn, Lost */}
                    {viewMode === 'detailed' && (
                      <td className="py-2 px-1.5 sm:px-2 text-center font-mono font-semibold text-emerald-400">
                        {row.won}
                      </td>
                    )}
                    {viewMode === 'detailed' && (
                      <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-amber-400">
                        {row.drawn}
                      </td>
                    )}
                    {viewMode === 'detailed' && (
                      <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-rose-400">
                        {row.lost}
                      </td>
                    )}

                    {/* Points */}
                    <td className="py-2 px-2 sm:px-3 text-center font-mono font-black text-xs sm:text-sm text-emerald-400 bg-emerald-950/20">
                      {row.points}
                    </td>

                    {/* If Detailed: GF, GA */}
                    {viewMode === 'detailed' && (
                      <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-slate-300">
                        {row.goalsFor}
                      </td>
                    )}
                    {viewMode === 'detailed' && (
                      <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-slate-400">
                        {row.goalsAgainst}
                      </td>
                    )}

                    {/* GD */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono font-bold">
                      <span
                        className={
                          row.goalDifference > 0
                            ? 'text-emerald-400'
                            : row.goalDifference < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }
                      >
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </span>
                    </td>

                    {/* Clean Sheets */}
                    <td className="py-2 px-1.5 sm:px-2 text-center font-mono text-slate-300">
                      {row.cleanSheets}
                    </td>

                    {/* Form Pills */}
                    <td className="py-2 px-1.5 sm:px-3">
                      <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                        {row.form.length === 0 ? (
                          <span className="text-[10px] text-slate-600 italic">No matches</span>
                        ) : (
                          row.recentMatches.map((match, idx) => (
                            <span
                              key={idx}
                              title={`${match.isHome ? 'vs' : '@'} ${match.opponentShortCode} (${match.score})`}
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded flex items-center justify-center text-[8px] sm:text-[9px] font-bold font-mono ${
                                match.result === 'W'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : match.result === 'D'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {match.result}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Details Arrow */}
                    <td className="py-2 px-2 text-right">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition inline-block" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Legend Bar */}
        <div className="bg-[#0a0c10]/90 px-3.5 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              <span className="w-2 h-2 rounded-sm bg-amber-500 shadow-sm shadow-amber-500/50" />
              <span className="text-amber-300 font-semibold">1st Place: League Champions</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Double Round-Robin (Home &amp; Away)</span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Click any column header to sort</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-end sm:self-auto">
            <span>Click any team row for detailed stats</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE LEAGUE INFORMATION & RULES (BELOW STANDINGS TABLE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Card 1: Format & Points System */}
        <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tournament Format</h4>
                <p className="text-[10px] text-slate-400">21 Teams • Double Round-Robin</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Matchdays:</span>
                <span className="font-semibold text-white font-mono">42 Matchdays</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Fixtures per Club:</span>
                <span className="font-semibold text-white font-mono">40 Matches (20 H / 20 A)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Bye Matchdays:</span>
                <span className="font-semibold text-slate-300 font-mono">2 Bye Rounds / Team</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Points System:</span>
                <span className="font-semibold text-emerald-400 font-mono">Win: 3 • Draw: 1 • Loss: 0</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Table auto-updates instantly upon match score confirmation.</span>
          </div>
        </div>

        {/* Card 2: Official Tiebreaker Rules */}
        <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tiebreaker Ranking</h4>
                <p className="text-[10px] text-slate-400">Official ranking priority order</p>
              </div>
            </div>

            <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside">
              <li className="py-0.5">
                <span className="font-semibold text-white">Points (Pts):</span>{' '}
                <span className="text-slate-400">Highest accumulated points</span>
              </li>
              <li className="py-0.5">
                <span className="font-semibold text-white">Goal Difference (GD):</span>{' '}
                <span className="text-slate-400">Goals For minus Goals Against</span>
              </li>
              <li className="py-0.5">
                <span className="font-semibold text-white">Goals For (GF):</span>{' '}
                <span className="text-slate-400">Highest total goals scored</span>
              </li>
              <li className="py-0.5">
                <span className="font-semibold text-white">Head-to-Head (H2H):</span>{' '}
                <span className="text-slate-400">Record in direct fixtures</span>
              </li>
              <li className="py-0.5">
                <span className="font-semibold text-white">Clean Sheets (CS) / Wins (W):</span>{' '}
                <span className="text-slate-400">Most clean sheets &amp; total wins</span>
              </li>
            </ol>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Strict tiebreaker sequence ensures fair ranking at all times.</span>
          </div>
        </div>

        {/* Card 3: Column Guide & Glossary */}
        <div className="bg-[#0f1219] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Column Glossary</h4>
                <p className="text-[10px] text-slate-400">Metric abbreviations explained</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300">
              <div>
                <span className="font-bold text-white font-mono">Pos:</span>{' '}
                <span className="text-slate-400 text-[11px]">Rank #</span>
              </div>
              <div>
                <span className="font-bold text-white font-mono">P:</span>{' '}
                <span className="text-slate-400 text-[11px]">Played</span>
              </div>
              <div>
                <span className="font-bold text-white font-mono">W / D / L:</span>{' '}
                <span className="text-slate-400 text-[11px]">Results</span>
              </div>
              <div>
                <span className="font-bold text-white font-mono">GF:</span>{' '}
                <span className="text-slate-400 text-[11px]">Goals For</span>
              </div>
              <div>
                <span className="font-bold text-white font-mono">GA:</span>{' '}
                <span className="text-slate-400 text-[11px]">Against</span>
              </div>
              <div>
                <span className="font-bold text-white font-mono">GD:</span>{' '}
                <span className="text-slate-400 text-[11px]">Goal Diff (+/-)</span>
              </div>
              <div>
                <span className="font-bold text-white font-mono">CS:</span>{' '}
                <span className="text-slate-400 text-[11px]">Clean Sheets</span>
              </div>
              <div>
                <span className="font-bold text-white font-mono">Pts:</span>{' '}
                <span className="text-slate-400 text-[11px]">Points Total</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[8px] font-bold inline-flex items-center justify-center font-mono">W</span>
              <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[8px] font-bold inline-flex items-center justify-center font-mono">D</span>
              <span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[8px] font-bold inline-flex items-center justify-center font-mono">L</span>
              <span className="ml-1">Form (Last 5)</span>
            </span>
            <span className="text-slate-500">Newest → Oldest</span>
          </div>
        </div>
      </div>
    </div>
  );
};
