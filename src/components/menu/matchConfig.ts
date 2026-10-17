import { MAX_BOT_COUNT } from '../../game/placement';
import { DEFAULT_CONFIG } from '../../game/engine';
import { MatchConfig } from '../../game/types';

export const DURATION_OPTIONS = [30, 60, 90, 120];
export const BOARD_SIZE_OPTIONS = [8, 12, 16];
export const MIN_BOTS = 0;
export const MAX_BOTS = MAX_BOT_COUNT;

// A type alias rather than an interface, so expo-router accepts it as a search-params shape.
export type MatchParams = {
  duration?: string;
  bots?: string;
  size?: string;
};

export function clampBotCount(count: number): number {
  return Math.min(MAX_BOTS, Math.max(MIN_BOTS, Math.round(count)));
}

// Route params arrive as strings. A missing or malformed value falls back to the default, and an
// out-of-range bot count is clamped rather than rejected. A board size must be one of the offered
// sizes, since anything else would ask for a board the menu can't make.
export function parseMatchParams({ duration, bots, size }: MatchParams): MatchConfig {
  const seconds = duration ? Number(duration) : NaN;
  const botCount = bots ? Number(bots) : NaN;
  const boardSize = size ? Number(size) : NaN;
  return {
    durationSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_CONFIG.durationSeconds,
    botCount: Number.isFinite(botCount) ? clampBotCount(botCount) : DEFAULT_CONFIG.botCount,
    boardSize: BOARD_SIZE_OPTIONS.includes(boardSize) ? boardSize : DEFAULT_CONFIG.boardSize,
  };
}

export function toMatchParams(config: MatchConfig): Required<MatchParams> {
  return {
    duration: String(config.durationSeconds),
    bots: String(config.botCount),
    size: String(config.boardSize),
  };
}
