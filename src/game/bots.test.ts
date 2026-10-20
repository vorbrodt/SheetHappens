import {
  BOT_POWER_UP_DELAY_MIN_MS,
  BOT_TELEPORT_INTERVAL_MS,
  chooseBotDirection,
  chooseTeleportTarget,
  scheduleBot,
} from './bots';
import { createEntity } from './engine';
import { getStartingPositions } from './placement';
import { Pickup } from './powerups/types';
import { createRng } from './random';
import { BOARD_SIZE, canMove, cellsOwned, createEmptyGrid, move, paint } from './rules';
import { BotTimers, Entity, Position } from './types';

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

  it('lets a ghost walk through others, held back only by the board edge', () => {
    const entities = makeEntities([
      { id: 'ghost', position: { row: 0, col: 0 } },
      { id: 'a', position: { row: 1, col: 0 } },
      { id: 'b', position: { row: 0, col: 1 } },
    ]).map((e) => (e.id === 'ghost' ? { ...e, ghost: true } : e));

    expect(chooseBotDirection(entities, 'ghost', () => 0)).toBe('down');
    expect(chooseBotDirection(entities, 'ghost', () => 0.999)).toBe('right');
  });

  it('steers clear of lethal entities', () => {
    const entities = makeEntities([
      { id: 'bot', position: { row: 0, col: 0 } },
      { id: 'lethal', position: { row: 1, col: 0 } },
    ]).map((e) => (e.id === 'lethal' ? { ...e, lethal: true } : e));

    for (const r of [0, 0.5, 0.999]) expect(chooseBotDirection(entities, 'bot', () => r)).toBe('right');
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

describe('chooseBotDirection goals', () => {
  function pickupAt(row: number, col: number): Pickup {
    return { id: `p-${row}-${col}`, kind: 'speedster', position: { row, col }, spawnedAt: 0, expiresAt: 20_000 };
  }

  function bot(patch: Partial<Entity> = {}): Entity[] {
    return makeEntities([{ id: 'bot', position: { row: 3, col: 3 } }]).map((e) => ({ ...e, ...patch }));
  }

  // In open space a wandering bot drawing 0 goes 'up', the first of the four.
  it('heads for a nearby pickup some of the time', () => {
    expect(chooseBotDirection(bot(), 'bot', () => 0, BOARD_SIZE, [pickupAt(3, 5)])).toBe('right');
    // A draw at or past the bias wanders: 0.6 picks the third of the four.
    expect(chooseBotDirection(bot(), 'bot', () => 0.6, BOARD_SIZE, [pickupAt(3, 5)])).toBe('left');
  });

  it('ignores pickups out of range, with full slots, or as a ghost', () => {
    const near = [pickupAt(3, 5)];
    expect(chooseBotDirection(bot(), 'bot', () => 0, BOARD_SIZE, [pickupAt(7, 7)])).toBe('up');
    expect(chooseBotDirection(bot({ inventory: ['speedster', 'jellyport'] }), 'bot', () => 0, BOARD_SIZE, near)).toBe(
      'up'
    );
    expect(chooseBotDirection(bot({ ghost: true }), 'bot', () => 0, BOARD_SIZE, near)).toBe('up');
  });

  it('hunts the nearest jelly while lethal', () => {
    const entities = [
      ...bot({ lethal: true }),
      ...makeEntities([
        { id: 'near', position: { row: 6, col: 3 } },
        { id: 'far', position: { row: 0, col: 0 } },
      ]),
    ];
    expect(chooseBotDirection(entities, 'bot', () => 0)).toBe('down');
  });

  it('wanders when no move gets it closer', () => {
    // Its only move leads away from the pickup behind the blocker.
    const entities = makeEntities([
      { id: 'bot', position: { row: 0, col: 0 } },
      { id: 'a', position: { row: 0, col: 1 } },
    ]);
    expect(chooseBotDirection(entities, 'bot', () => 0, BOARD_SIZE, [pickupAt(0, 2)])).toBe('down');
  });
});

describe('chooseTeleportTarget', () => {
  const entities = makeEntities([
    { id: 'bot', position: { row: 0, col: 0 } },
    { id: 'a', position: { row: 0, col: 1 } },
  ]);

  it('picks a random free cell other than its own', () => {
    expect(chooseTeleportTarget(entities, 'bot', () => 0)).toEqual({ row: 0, col: 2 });
    expect(chooseTeleportTarget(entities, 'bot', () => 0.999)).toEqual({ row: 7, col: 7 });
  });

  it('returns null when nowhere is free', () => {
    expect(chooseTeleportTarget(entities, 'bot', () => 0, 1)).toBeNull();
  });
});

describe('scheduleBot', () => {
  const [plain] = makeEntities([{ id: 'bot', position: { row: 0, col: 0 } }]);
  const timers: BotTimers = { nextMoveAt: 600 };

  it('keeps the same timers when nothing changes', () => {
    expect(scheduleBot(timers, plain, 1_000, () => 0)).toBe(timers);
  });

  it('schedules a use for a carried power-up and a teleport while it can teleport, and drops them after', () => {
    const bot: Entity = { ...plain, inventory: ['speedster', null], canTeleport: true };
    const scheduled = scheduleBot(timers, bot, 1_000, () => 0);

    expect(scheduled).toEqual({
      nextMoveAt: 600,
      usePowerUpAt: 1_000 + BOT_POWER_UP_DELAY_MIN_MS,
      teleportAt: 1_000 + BOT_TELEPORT_INTERVAL_MS,
    });
    expect(scheduleBot(scheduled, bot, 1_500, () => 0)).toBe(scheduled);
    expect(scheduleBot(scheduled, plain, 1_500, () => 0)).toEqual(timers);
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
