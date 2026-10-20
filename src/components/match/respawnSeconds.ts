// Whole seconds until a dead entity respawns, at least 1 so a respawn retrying while every corner
// is taken still counts down from 1, or null while it is alive.
export function respawnSeconds(respawnAt: number | null | undefined, elapsedMs: number): number | null {
  if (respawnAt === null || respawnAt === undefined) return null;
  return Math.max(1, Math.ceil((respawnAt - elapsedMs) / 1000));
}
