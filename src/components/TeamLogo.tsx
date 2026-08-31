import React, { useState } from 'react';
import { Team } from '../types';
import { getTeamLogoUrl } from '../assets/teamLogos';

interface TeamLogoProps {
  team: Team;
  size?: 'xs' | 'sm' | 'table' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 min-w-6 text-[10px]',
  sm: 'w-8 h-8 min-w-8 text-xs',
  table: 'w-5 h-5 min-w-5 sm:w-10 sm:h-10 sm:min-w-10 text-[8px] sm:text-xs',
  md: 'w-10 h-10 min-w-10 text-xs',
  lg: 'w-14 h-14 min-w-14 text-sm',
  xl: 'w-16 h-16 min-w-16 text-base',
};

export const TeamLogo: React.FC<TeamLogoProps> = ({
  team,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const isTable = size === 'table';
  const paddingClass = isTable ? 'p-0.5 sm:p-1 rounded sm:rounded-lg' : 'p-1 rounded-lg';
  const localLogo = getTeamLogoUrl(team.id, team.clubName);
  const logoSrc = localLogo || team.logo;

  if (logoSrc && !hasError) {
    return (
      <div
        className={`relative flex items-center justify-center bg-[#0a0c10]/90 border border-slate-800/90 shadow-sm shrink-0 overflow-hidden ${paddingClass} ${sizeClass} ${className}`}
        style={{
          boxShadow: `0 0 10px ${team.color}15`,
        }}
      >
        <img
          src={logoSrc}
          alt={`${team.clubName} official logo`}
          className="w-full h-full object-contain filter drop-shadow-sm transition-transform group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback badge if image is not reachable
  return (
    <div
      className={`flex items-center justify-center font-black text-white shadow-inner border border-white/20 shrink-0 ${isTable ? 'rounded sm:rounded-lg' : 'rounded-lg'} ${sizeClass} ${className}`}
      style={{ backgroundColor: team.color }}
      title={team.clubName}
    >
      {team.shortCode}
    </div>
  );
};

