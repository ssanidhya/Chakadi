import type { GameConfig } from '../models/game-config.ts';
import type { Player, PlayerId, TeamId } from '../models/player.ts';
import type { TeamScore } from '../models/team.ts';

export interface HandSettlement {
  declarerTeamId: TeamId;
  contractBid: number;
  declarerTricksWon: number;
  contractSucceeded: boolean;
  penaltyAward: number;
  awardedToTeamId: TeamId;
  updatedScores: Record<TeamId, TeamScore>;
  nextDealerId: PlayerId;
  coatAwardedToTeamId?: TeamId;
  isGameOver: boolean;
  winnerTeamId?: TeamId;
}

export function calculateHandSettlement(
  declarerTeamId: TeamId,
  contractBid: number,
  declarerTricksWon: number,
  currentScores: Record<TeamId, TeamScore>,
  currentDealerId: PlayerId,
  players: Player[],
  config: GameConfig
): HandSettlement {
  const contractSucceeded = declarerTricksWon >= contractBid;
  const penaltyAward = contractSucceeded ? contractBid : 2 * contractBid;

  const opposingTeamId: TeamId = declarerTeamId === 'team_a' ? 'team_b' : 'team_a';
  const awardedToTeamId: TeamId = contractSucceeded ? opposingTeamId : declarerTeamId;

  const updatedScores: Record<TeamId, TeamScore> = {
    team_a: { ...currentScores.team_a!, tricksWon: 0 },
    team_b: { ...currentScores.team_b!, tricksWon: 0 },
  };

  const dealer = players.find((p) => p.id === currentDealerId)!;
  const dealerTeamId = dealer.teamId;

  let nextDealerId = currentDealerId;
  let zeroCrossingOccurred = false;
  let hit48Threshold = false;

  if (awardedToTeamId === dealerTeamId) {
    updatedScores[dealerTeamId]!.penaltyPoints += penaltyAward;
  } else {
    const currentDealerGunti = updatedScores[dealerTeamId]!.penaltyPoints;
    const remainingAfterCancel = currentDealerGunti - penaltyAward;

    if (remainingAfterCancel < 0) {
      const carryOver = Math.abs(remainingAfterCancel);
      updatedScores[dealerTeamId]!.penaltyPoints = 0;
      updatedScores[opposingTeamId]!.penaltyPoints += carryOver;
      zeroCrossingOccurred = true;
    } else {
      updatedScores[dealerTeamId]!.penaltyPoints = remainingAfterCancel;
    }
  }

  let coatAwardedToTeamId: TeamId | undefined;

  for (const teamId of ['team_a', 'team_b'] as TeamId[]) {
    const score = updatedScores[teamId]!;
    if (score.penaltyPoints >= config.targetPointThreshold) {
      coatAwardedToTeamId = teamId;
      hit48Threshold = true;
      score.coat += 1;
      score.penaltyPoints -= config.targetPointThreshold;

      const otherTeamId: TeamId = teamId === 'team_a' ? 'team_b' : 'team_a';
      if (updatedScores[otherTeamId]!.coat > 0) {
        updatedScores[otherTeamId]!.coat -= 1;
      }

      if (teamId === dealerTeamId) {
        nextDealerId = getNextPlayerOnSameTeam(dealer, players);
      }
    }
  }

  if (zeroCrossingOccurred && !hit48Threshold) {
    nextDealerId = getNextPlayerClockwise(dealer, players);
  }

  let isGameOver = false;
  let winnerTeamId: TeamId | undefined;

  if (updatedScores.team_a!.coat >= config.coatLimit) {
    isGameOver = true;
    winnerTeamId = 'team_b';
  } else if (updatedScores.team_b!.coat >= config.coatLimit) {
    isGameOver = true;
    winnerTeamId = 'team_a';
  }

  return {
    declarerTeamId,
    contractBid,
    declarerTricksWon,
    contractSucceeded,
    penaltyAward,
    awardedToTeamId,
    updatedScores,
    nextDealerId,
    coatAwardedToTeamId,
    isGameOver,
    winnerTeamId,
  };
}

export function getNextPlayerClockwise(current: Player, players: Player[]): PlayerId {
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  const currentIndex = sorted.findIndex((p) => p.id === current.id);
  const nextIndex = (currentIndex + 1) % sorted.length;
  return sorted[nextIndex]!.id;
}

export function getNextPlayerOnSameTeam(current: Player, players: Player[]): PlayerId {
  const sameTeamPlayers = players
    .filter((p) => p.teamId === current.teamId)
    .sort((a, b) => a.seat - b.seat);
  const currentIndex = sameTeamPlayers.findIndex((p) => p.id === current.id);
  const nextIndex = (currentIndex + 1) % sameTeamPlayers.length;
  return sameTeamPlayers[nextIndex]!.id;
}
