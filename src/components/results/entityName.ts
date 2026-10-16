import { PLAYER_ID } from '../../game/store';
import { PlayerId } from '../../game/types';

// "You" for the player, "Bot 2" for "bot-2".
export function entityName(id: PlayerId): string {
  if (id === PLAYER_ID) return 'You';
  const botNumber = /^bot-(\d+)$/.exec(id)?.[1];
  return botNumber ? `Bot ${botNumber}` : id;
}
