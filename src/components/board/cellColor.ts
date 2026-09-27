import { PLAYER_COLORS } from './playerColors';
import { PlayerId } from './types';

const NEUTRAL_CELL_COLOR = '#F1F2F4';

// Even at intensity 0, an owned cell should show a faint tint rather than disappear.
const MIN_INTENSITY_ALPHA = 0.15;

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return { r, g, b };
}

export function getCellColor(owner: PlayerId | null, intensity: number): string {
  const baseColor = owner ? PLAYER_COLORS[owner] : undefined;
  if (!baseColor) {
    return NEUTRAL_CELL_COLOR;
  }

  const { r, g, b } = hexToRgb(baseColor);
  const clampedIntensity = Math.min(100, Math.max(0, intensity));
  const alpha = MIN_INTENSITY_ALPHA + (clampedIntensity / 100) * (1 - MIN_INTENSITY_ALPHA);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
