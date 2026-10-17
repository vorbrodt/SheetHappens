import { create } from 'zustand';

import { applyInput, createMatch, DEFAULT_CONFIG, setPaused, step } from '../game/engine';
import { Direction, MatchConfig, MatchInput, MatchState, PlayerId } from '../game/types';

// The id the player on this device plays under in single-player matches.
const LOCAL_PLAYER_ID: PlayerId = 'player';

// Why the match is held: the player opened the pause menu, or the app left the foreground.
export type PauseReason = 'menu' | 'background';

const NOT_PAUSED: Record<PauseReason, boolean> = { menu: false, background: false };

interface GameStore {
  match: MatchState;
  config: MatchConfig;
  // The entity this device controls; the UI shows its stats and sends its inputs.
  localPlayerId: PlayerId;
  // The direction the local player is holding a swipe in. Its move repeats every step while held.
  heldDirection: Direction | null;
  // Every reason currently holding the match. It resumes only once none is left, so coming back to
  // the foreground never unpauses behind the pause menu.
  pausedBy: Record<PauseReason, boolean>;
  // Starts a fresh match in the countdown phase.
  initMatch: (config?: Partial<MatchConfig>) => void;
  // Applies an input at the current match time. The engine ignores it unless the match is playing.
  dispatch: (input: MatchInput) => void;
  // Holds (or, with null, releases) the local player's swipe; a new direction moves straight away.
  holdDirection: (direction: Direction | null) => void;
  // Advances the match by wall-clock time; called once per frame by the game loop.
  step: (deltaMs: number) => void;
  // Sets or clears one reason to hold the match; it resumes when the last one is cleared.
  setPaused: (reason: PauseReason, paused: boolean) => void;
}

export const useGameStore = create<GameStore>()((set, get) => {
  const setMatch = (match: MatchState) => {
    if (match !== get().match) set({ match });
  };

  return {
    match: createMatch(DEFAULT_CONFIG, LOCAL_PLAYER_ID),
    config: DEFAULT_CONFIG,
    localPlayerId: LOCAL_PLAYER_ID,
    heldDirection: null,
    pausedBy: NOT_PAUSED,

    initMatch: (config) => {
      const nextConfig = { ...get().config, ...config };
      set({
        match: createMatch(nextConfig, LOCAL_PLAYER_ID),
        config: nextConfig,
        localPlayerId: LOCAL_PLAYER_ID,
        heldDirection: null,
        pausedBy: NOT_PAUSED,
      });
    },

    dispatch: (input) => {
      const { match } = get();
      setMatch(applyInput(match, input, match.elapsedMs));
    },

    holdDirection: (direction) => {
      if (direction === get().heldDirection) return;
      set({ heldDirection: direction });
      if (direction) get().dispatch({ type: 'move', entityId: get().localPlayerId, direction });
    },

    step: (deltaMs) => {
      const { match, heldDirection, localPlayerId } = get();
      // The engine repeats the held move at exactly the player's move interval, stamped with the
      // moment it came due, rather than on frame boundaries.
      const held = heldDirection ? { [localPlayerId]: heldDirection } : {};
      setMatch(step(match, deltaMs, Math.random, held));
    },

    setPaused: (reason, paused) => {
      const pausedBy = { ...get().pausedBy, [reason]: paused };
      set({ pausedBy });
      setMatch(setPaused(get().match, pausedBy.menu || pausedBy.background));
    },
  };
});
