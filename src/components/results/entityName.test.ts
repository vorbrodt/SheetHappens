import { entityName } from './entityName';

describe('entityName', () => {
  it('calls the local player "You"', () => {
    expect(entityName('player', 'player')).toBe('You');
  });

  it('numbers bots by their id', () => {
    expect(entityName('bot-1', 'player')).toBe('Bot 1');
    expect(entityName('bot-5', 'player')).toBe('Bot 5');
  });

  it('falls back to the raw id', () => {
    expect(entityName('mystery', 'player')).toBe('mystery');
  });
});
