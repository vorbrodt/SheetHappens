import { PLAYER_ID } from '../../game/store';
import { entityName } from './entityName';

describe('entityName', () => {
  it('calls the player "You"', () => {
    expect(entityName(PLAYER_ID)).toBe('You');
  });

  it('numbers bots by their id', () => {
    expect(entityName('bot-1')).toBe('Bot 1');
    expect(entityName('bot-5')).toBe('Bot 5');
  });

  it('falls back to the raw id', () => {
    expect(entityName('mystery')).toBe('mystery');
  });
});
