import { Match } from '../types';

/**
 * Returns the best real-life timestamp in milliseconds for a match.
 * Priority: playedAt -> submittedAt -> matchDate -> null
 */
export function getMatchRealLifeTimestamp(match: Match): number | null {
  const dateStr = match.playedAt || match.submittedAt || match.matchDate;
  if (!dateStr) return null;
  const ts = new Date(dateStr).getTime();
  return isNaN(ts) ? null : ts;
}

/**
 * Returns local YYYY-MM-DD key for a given date or timestamp.
 */
export function getLocalDateKey(dateInput: Date | number | string): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Relative time description (e.g. "Just now", "25m ago", "3h ago", "Yesterday", "4 days ago")
 */
export function getRelativeTimeDescription(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Formatted real-life date & time details for a match.
 */
export function formatMatchRealLifeDateTime(match: Match): {
  timestamp: number | null;
  dateStr: string;
  timeStr: string;
  relativeStr: string;
  fullStr: string;
  dayKey: string;
} {
  const ts = getMatchRealLifeTimestamp(match);

  if (!ts) {
    return {
      timestamp: null,
      dateStr: 'No date recorded',
      timeStr: '',
      relativeStr: 'Undated',
      fullStr: 'Date not recorded',
      dayKey: '',
    };
  }

  const dateObj = new Date(ts);
  const dayKey = getLocalDateKey(dateObj);

  const dateStr = dateObj.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeStr = dateObj.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const relativeStr = getRelativeTimeDescription(ts);
  const fullStr = `${dateStr} at ${timeStr}`;

  return {
    timestamp: ts,
    dateStr,
    timeStr,
    relativeStr,
    fullStr,
    dayKey,
  };
}

/**
 * Label for a dayKey (e.g. "Today", "Yesterday", or "Saturday, Sep 5, 2026")
 */
export function getDayKeyHumanLabel(dayKey: string): { mainLabel: string; subLabel: string; isToday: boolean; isYesterday: boolean } {
  if (!dayKey) {
    return { mainLabel: 'Undated Matches', subLabel: 'No timestamp available', isToday: false, isYesterday: false };
  }

  const todayKey = getLocalDateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterdayDate);

  const [yearStr, monthStr, dayStr] = dayKey.split('-');
  const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));

  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : dayKey;

  if (dayKey === todayKey) {
    return {
      mainLabel: 'Today',
      subLabel: formattedDate,
      isToday: true,
      isYesterday: false,
    };
  }

  if (dayKey === yesterdayKey) {
    return {
      mainLabel: 'Yesterday',
      subLabel: formattedDate,
      isToday: false,
      isYesterday: true,
    };
  }

  return {
    mainLabel: formattedDate,
    subLabel: '',
    isToday: false,
    isYesterday: false,
  };
}

export interface MatchesDayGroup {
  dayKey: string;
  mainLabel: string;
  subLabel: string;
  isToday: boolean;
  isYesterday: boolean;
  timestamp: number;
  matches: Match[];
  totalGoals: number;
}

/**
 * Groups an array of matches by real-life day key (YYYY-MM-DD).
 */
export function groupMatchesByRealLifeDay(matches: Match[], sortOrder: 'desc' | 'asc' = 'desc'): MatchesDayGroup[] {
  const groupsMap = new Map<string, Match[]>();

  matches.forEach((m) => {
    const { dayKey } = formatMatchRealLifeDateTime(m);
    const key = dayKey || 'undated';
    const current = groupsMap.get(key) || [];
    current.push(m);
    groupsMap.set(key, current);
  });

  const result: MatchesDayGroup[] = [];

  groupsMap.forEach((groupMatches, key) => {
    const labels = getDayKeyHumanLabel(key === 'undated' ? '' : key);
    let sampleTs = 0;
    if (key !== 'undated') {
      const [y, mo, d] = key.split('-');
      sampleTs = new Date(Number(y), Number(mo) - 1, Number(d)).getTime();
    }

    const totalGoals = groupMatches.reduce(
      (sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0),
      0
    );

    // Within each group, sort matches by timestamp
    const sortedGroupMatches = [...groupMatches].sort((a, b) => {
      const tsA = getMatchRealLifeTimestamp(a) || 0;
      const tsB = getMatchRealLifeTimestamp(b) || 0;
      return sortOrder === 'desc' ? tsB - tsA : tsA - tsB;
    });

    result.push({
      dayKey: key,
      mainLabel: labels.mainLabel,
      subLabel: labels.subLabel,
      isToday: labels.isToday,
      isYesterday: labels.isYesterday,
      timestamp: sampleTs,
      matches: sortedGroupMatches,
      totalGoals,
    });
  });

  // Sort groups by date
  result.sort((a, b) => {
    if (a.dayKey === 'undated') return 1;
    if (b.dayKey === 'undated') return -1;
    return sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
  });

  return result;
}
