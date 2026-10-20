import { DIRECTION_DELTAS } from '../../game/rules';
import { MatchState, Position } from '../../game/types';

export interface PaintSplash {
  position: Position;
  color: string;
}

/**
 * The cell and painter's color of every paint in `match.events`, in order. A paint lands on the
 * painter's cell at that moment, and a bot can paint and then move within one step, so each
 * position is worked back from where the entity ended up by undoing the moves that came after it.
 */
export function paintSplashes(match: MatchState): PaintSplash[] {
  const positions = new Map(match.entities.map((e) => [e.id, e.position]));
  const colors = new Map(match.entities.map((e) => [e.id, e.color]));
  const splashes: PaintSplash[] = [];

  for (let i = match.events.length - 1; i >= 0; i--) {
    const event = match.events[i];
    if (event.type !== 'moved' && event.type !== 'painted') continue;
    const position = positions.get(event.entityId);
    const color = colors.get(event.entityId);
    if (!position || !color) continue;

    if (event.type === 'moved') {
      const delta = DIRECTION_DELTAS[event.direction];
      positions.set(event.entityId, {
        row: position.row - delta.row * event.distance,
        col: position.col - delta.col * event.distance,
      });
    } else {
      splashes.push({ position, color });
    }
  }

  return splashes.reverse();
}
