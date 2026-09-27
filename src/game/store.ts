import { create } from 'zustand';

import { getStartingPositions } from './placement';
import { createEmptyGrid, move, paint } from './rules';
import { Direction, Entity, Grid, MatchConfig, PlayerId } from './types';

export const PLAYER_ID: PlayerId = 'player';

const PLAYER_COLOR = '#EC4899';
const BOT_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

const DEFAULT_CONFIG: MatchConfig = { durationSeconds: 60, botCount: 2 };

function createEntities(botCount: number): Entity[] {
  const { player, bots } = getStartingPositions(botCount);
  return [
    { id: PLAYER_ID, color: PLAYER_COLOR, position: player },
    ...bots.map((position, index) => ({
      id: `bot-${index + 1}`,
      color: BOT_COLORS[index],
      position,
    })),
  ];
}

interface GameStore {
  grid: Grid;
  entities: Entity[];
  config: MatchConfig;
  initMatch: (config?: Partial<MatchConfig>) => void;
  move: (entityId: PlayerId, direction: Direction) => void;
  paint: (entityId: PlayerId) => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  grid: createEmptyGrid(),
  entities: createEntities(DEFAULT_CONFIG.botCount),
  config: DEFAULT_CONFIG,

  initMatch: (config) => {
    const nextConfig = { ...get().config, ...config };
    set({
      grid: createEmptyGrid(),
      entities: createEntities(nextConfig.botCount),
      config: nextConfig,
    });
  },

  move: (entityId, direction) => set((state) => ({ entities: move(state.entities, entityId, direction) })),

  paint: (entityId) => set((state) => ({ grid: paint(state.grid, state.entities, entityId) })),
}));
