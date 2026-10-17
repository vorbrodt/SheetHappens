import { chooseBotDirection } from './bots';
import { createEntity } from './engine';
import { getStartingPositions } from './placement';
import { createRng } from './random';
import { BOARD_SIZE, canMove, cellsOwned, createEmptyGrid, move, paint } from './rules';
import { Entity, Position } from './types';

function makeEntities(entries: { id: string; position: Position }[]): Entity[] {
  return entries.map(({ id, position }) => createEntity({ id, color: '#000000', position }));
}

describe('chooseBotDirection', () => {
  it('only returns directions that stay on the board', () => {
    const entities = makeEntities([{ id: 'bot', position: { row: 0, col: 0 } }]);

    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(['down', 'right']).toContain(chooseBotDirection(entities, 'bot', () => r));
    }
  });

  it('re-rolls away from occupied cells', () => {
    const entities = makeEntities([
      { id: 'bot', position: { row: 0, col: 0 } },
      { id: 'other', position: { row: 1, col: 0 } },
    ]);

    for (const r of [0, 0.5, 0.999]) {
      expect(chooseBotDirection(entities, 'bot', () => r)).toBe('right');
    }
  });

  it('stays put when every direction is blocked', () => {
    const entities = makeEntities([
      { id: 'bot', position: { row: 0, col: 0 } },
      { id: 'a', position: { row: 1, col: 0 } },
      { id: 'b', position: { row: 0, col: 1 } },
    ]);

    expect(chooseBotDirection(entities, 'bot')).toBeNull();
  });

  it('uses the board size it is given', () => {
    const entities = makeEntities([{ id: 'bot', position: { row: 7, col: 7 } }]);
    const picks = (boardSize: number) =>
      new Set([0, 0.25, 0.5, 0.75].map((r) => chooseBotDirection(entities, 'bot', () => r, boardSize)));

    expect(picks(BOARD_SIZE)).toEqual(new Set(['up', 'left']));
    expect(picks(16)).toEqual(new Set(['up', 'down', 'left', 'right']));
  });

  it('can pick every legal direction in open space', () => {
    const entities = makeEntities([{ id: 'bot', position: { row: 3, col: 3 } }]);
    const picks = new Set([0, 0.25, 0.5, 0.75].map((r) => chooseBotDirection(entities, 'bot', () => r)));

    expect(picks).toEqual(new Set(['up', 'down', 'left', 'right']));
  });
});

describe('bot simulation', () => {
  it('runs 5 bots without overlap or leaving the board, and they paint cells', () => {
    const random = createRng(12);
    const { player, bots } = getStartingPositions(5);
    let entities = makeEntities([
      { id: 'player', position: player },
      ...bots.map((position, index) => ({ id: `bot-${index + 1}`, position })),
    ]);
    const botIds = entities.filter((e) => e.id !== 'player').map((e) => e.id);
    let grid = createEmptyGrid();

    for (let tick = 0; tick < 500; tick++) {
      for (const botId of botIds) {
        const direction = chooseBotDirection(entities, botId, random);
        if (direction) {
          expect(canMove(entities, botId, direction)).toBe(true);
          entities = move(entities, botId, direction);
        }
      }
      // Entering a cell paints it, as does standing on it.
      for (const botId of botIds) grid = paint(grid, entities, botId);

      const keys = entities.map((e) => `${e.position.row},${e.position.col}`);
      expect(new Set(keys).size).toBe(entities.length);
      for (const { position } of entities) {
        expect(position.row).toBeGreaterThanOrEqual(0);
        expect(position.row).toBeLessThan(BOARD_SIZE);
        expect(position.col).toBeGreaterThanOrEqual(0);
        expect(position.col).toBeLessThan(BOARD_SIZE);
      }
    }

    for (const botId of botIds) {
      expect(cellsOwned(grid, botId)).toBeGreaterThan(0);
    }
  });
});
