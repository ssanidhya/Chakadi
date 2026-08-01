import type { TeamId } from './player.ts';

export interface TeamScore {
  teamId: TeamId;
  penaltyPoints: number; // Gunti / Dhaand (wraps around at target threshold e.g. 48)
  coat: number;          // Kot (major loss tally)
  tricksWon: number;     // Tricks won in current hand
}

export function createInitialTeamScore(teamId: TeamId): TeamScore {
  return {
    teamId,
    penaltyPoints: 0,
    coat: 0,
    tricksWon: 0,
  };
}
