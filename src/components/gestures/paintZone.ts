export const PAINT_ZONE_HEIGHT_RATIO = 0.15;

export function isPointInPaintZone(
  y: number,
  surfaceHeight: number,
  ratio: number = PAINT_ZONE_HEIGHT_RATIO
): boolean {
  if (surfaceHeight <= 0) {
    return false;
  }

  return y >= surfaceHeight * (1 - ratio);
}
