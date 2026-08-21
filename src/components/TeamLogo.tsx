import React, { useState } from 'react';
import { Team } from '../types';
import { getTeamLogoUrl } from '../assets/teamLogos';

interface TeamLogoProps {
  team: Team;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 min-w-5 text-[9px]',
  sm: 'w-7 h-7 min-w-7 text-[10px]',
  md: 'w-9 h-9 min-w-9 text-xs',
  lg: 'w-12 h-12 min-w-12 text-sm',
  xl: 'w-16 h-16 min-w-16 text-base',
};

export const TeamLogo: React.FC<TeamLogoProps> = ({
  team,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const localLogo = getTeamLogoUrl(team.id, team.clubName);
  const logoSrc = localLogo || team.logo;

  if (logoSrc && !hasError) {
    return (
      <div
        className={`relative rounded-lg p-1 flex items-center justify-center bg-[#0a0c10]/90 border border-slate-800/90 shadow-sm shrink-0 overflow-hidden ${sizeClass} ${className}`}
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
      className={`rounded-lg flex items-center justify-center font-black text-white shadow-inner border border-white/20 shrink-0 ${sizeClass} ${className}`}
      style={{ backgroundColor: team.color }}
      title={team.clubName}
    >
      {team.shortCode}
    </div>
  );
};

