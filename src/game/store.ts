import { create } from 'zustand';

import { getStartingPositions } from './placement';
import { createEmptyGrid, move, paint } from './rules';
import { Direction, Entity, Grid, MatchConfig, MatchStatus, PlayerId } from './types';

export const PLAYER_ID: PlayerId = 'player';

const PLAYER_COLOR = '#EC4899';
// Kept clear of the player's pink and the neutral cell gray.
const BOT_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

export const DEFAULT_CONFIG: MatchConfig = { durationSeconds: 60, botCount: 2 };

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
  status: MatchStatus;
  remainingMs: number;
  initMatch: (config?: Partial<MatchConfig>) => void;
  // Moves and paints are ignored unless the match is playing, so a paused or ended match is frozen.
  move: (entityId: PlayerId, direction: Direction) => void;
  paint: (entityId: PlayerId) => void;
  // Counts the clock down while playing and ends the match when it reaches 0.
  tick: (deltaMs: number) => void;
  setPaused: (paused: boolean) => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  grid: createEmptyGrid(),
  entities: createEntities(DEFAULT_CONFIG.botCount),
  config: DEFAULT_CONFIG,
  status: 'playing',
  remainingMs: DEFAULT_CONFIG.durationSeconds * 1000,

  initMatch: (config) => {
    const nextConfig = { ...get().config, ...config };
    set({
      grid: createEmptyGrid(),
      entities: createEntities(nextConfig.botCount),
      config: nextConfig,
      status: 'playing',
      remainingMs: nextConfig.durationSeconds * 1000,
    });
  },

  move: (entityId, direction) => {
    if (get().status !== 'playing') return;
    set((state) => ({ entities: move(state.entities, entityId, direction) }));
  },

  paint: (entityId) => {
    if (get().status !== 'playing') return;
    set((state) => ({ grid: paint(state.grid, state.entities, entityId) }));
  },

  tick: (deltaMs) => {
    if (get().status !== 'playing') return;
    const remainingMs = Math.max(0, get().remainingMs - deltaMs);
    set({ remainingMs, status: remainingMs === 0 ? 'ended' : 'playing' });
  },

  setPaused: (paused) => {
    const { status } = get();
    if (paused && status === 'playing') set({ status: 'paused' });
    if (!paused && status === 'paused') set({ status: 'playing' });
  },
}));
