import { createMatch } from '../../game/engine';
import { MatchEvent, MatchState } from '../../game/types';
import { paintSplashes } from './paintSplashes';

function matchWith(events: MatchEvent[]): MatchState {
  const match = createMatch({ durationSeconds: 60, botCount: 1, boardSize: 8 }, 'player');
  return {
    ...match,
    entities: match.entities.map((e) =>
      e.id === 'player' ? { ...e, color: '#FF0000', position: { row: 3, col: 3 } } : e
    ),
    events,
  };
}

describe('paintSplashes', () => {
  it('splashes the painter’s cell in the painter’s color', () => {
    expect(paintSplashes(matchWith([{ type: 'painted', entityId: 'player' }]))).toEqual([
      { position: { row: 3, col: 3 }, color: '#FF0000' },
    ]);
  });

  it('ignores moves and unknown entities', () => {
    const match = matchWith([
      { type: 'moved', entityId: 'player', direction: 'up', distance: 1 },
      { type: 'painted', entityId: 'ghost' },
    ]);
    expect(paintSplashes(match)).toEqual([]);
  });

  it('places a paint made before a later move in the same step on the cell it was made in', () => {
    const match = matchWith([
      { type: 'painted', entityId: 'player' },
      { type: 'moved', entityId: 'player', direction: 'right', distance: 1 },
      { type: 'painted', entityId: 'player' },
    ]);
    expect(paintSplashes(match).map((s) => s.position)).toEqual([
      { row: 3, col: 2 },
      { row: 3, col: 3 },
    ]);
  });
});
