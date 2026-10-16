import { PlayerId } from '../../game/types';

// "You" for the local player, "Bot 2" for "bot-2".
export function entityName(id: PlayerId, localPlayerId: PlayerId): string {
  if (id === localPlayerId) return 'You';
  const botNumber = /^bot-(\d+)$/.exec(id)?.[1];
  return botNumber ? `Bot ${botNumber}` : id;
}
