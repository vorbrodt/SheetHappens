import { create } from 'zustand';

import { getStartingPositions } from './placement';
import { createEmptyGrid, move, paint } from './rules';
import { Direction, Entity, Grid, MatchConfig, MatchStatus, PlayerId } from './types';

export const PLAYER_ID: PlayerId = 'player';

const PLAYER_COLOR = '#EC4899';
// Kept clear of the player's pink and the neutral cell gray.
const BOT_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

export const DEFAULT_CONFIG: MatchConfig = { durationSeconds: 60, botCount: 2 };

// Length of the 3-2-1 countdown that runs before every match.
export const COUNTDOWN_MS = 3_000;

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
  // Time left on the pre-match countdown; 0 once the match has started.
  countdownMs: number;
  // Starts a fresh match in the countdown phase.
  initMatch: (config?: Partial<MatchConfig>) => void;
  // Moves and paints are ignored unless the match is playing, so a counting-down, paused or ended
  // match is frozen.
  move: (entityId: PlayerId, direction: Direction) => void;
  paint: (entityId: PlayerId) => void;
  // Runs the pre-match countdown and then starts play; while playing, counts the match clock down
  // and ends the match when it reaches 0.
  tick: (deltaMs: number) => void;
  setPaused: (paused: boolean) => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  grid: createEmptyGrid(),
  entities: createEntities(DEFAULT_CONFIG.botCount),
  config: DEFAULT_CONFIG,
  status: 'countdown',
  remainingMs: DEFAULT_CONFIG.durationSeconds * 1000,
  countdownMs: COUNTDOWN_MS,

  initMatch: (config) => {
    const nextConfig = { ...get().config, ...config };
    set({
      grid: createEmptyGrid(),
      entities: createEntities(nextConfig.botCount),
      config: nextConfig,
      status: 'countdown',
      remainingMs: nextConfig.durationSeconds * 1000,
      countdownMs: COUNTDOWN_MS,
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
    const { status } = get();
    if (status === 'countdown') {
      const countdownMs = Math.max(0, get().countdownMs - deltaMs);
      set({ countdownMs, status: countdownMs === 0 ? 'playing' : 'countdown' });
      return;
    }
    if (status !== 'playing') return;
    const remainingMs = Math.max(0, get().remainingMs - deltaMs);
    set({ remainingMs, status: remainingMs === 0 ? 'ended' : 'playing' });
  },

  setPaused: (paused) => {
    const { status } = get();
    if (paused && (status === 'playing' || status === 'countdown')) set({ status: 'paused' });
    // A match paused before it started resumes its countdown rather than jumping straight to play.
    if (!paused && status === 'paused') {
      set({ status: get().countdownMs > 0 ? 'countdown' : 'playing' });
    }
  },
}));
