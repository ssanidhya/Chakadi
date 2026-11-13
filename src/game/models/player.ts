export type TeamId = 'team_a' | 'team_b' | 'unassigned';
export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  teamId: TeamId;
  seat: number; // 0-indexed position around table (0 to playerCount - 1)
}
