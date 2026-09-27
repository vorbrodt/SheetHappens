export type PlayerId = string;

export interface CellData {
  owner: PlayerId | null;
  intensity: number;
}
