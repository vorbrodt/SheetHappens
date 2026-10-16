import { MAX_BOT_COUNT } from '../../game/placement';
import { DEFAULT_CONFIG } from '../../game/store';
import { MatchConfig } from '../../game/types';

export const DURATION_OPTIONS = [30, 60, 90, 120];
export const MIN_BOTS = 0;
export const MAX_BOTS = MAX_BOT_COUNT;

// A type alias rather than an interface, so expo-router accepts it as a search-params shape.
export type MatchParams = {
  duration?: string;
  bots?: string;
};

export function clampBotCount(count: number): number {
  return Math.min(MAX_BOTS, Math.max(MIN_BOTS, Math.round(count)));
}

// Route params arrive as strings. A missing or malformed value falls back to the default, and an
// out-of-range bot count is clamped rather than rejected.
export function parseMatchParams({ duration, bots }: MatchParams): MatchConfig {
  const seconds = duration ? Number(duration) : NaN;
  const botCount = bots ? Number(bots) : NaN;
  return {
    durationSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_CONFIG.durationSeconds,
    botCount: Number.isFinite(botCount) ? clampBotCount(botCount) : DEFAULT_CONFIG.botCount,
  };
}

export function toMatchParams(config: MatchConfig): Required<MatchParams> {
  return { duration: String(config.durationSeconds), bots: String(config.botCount) };
}
