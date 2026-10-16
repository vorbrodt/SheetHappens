import { useEffect } from 'react';

import { BOT_MOVE_INTERVAL_MS, BOT_PAINT_INTERVAL_MS, chooseBotDirection } from '../../game/bots';
import { PLAYER_ID, useGameStore } from '../../game/store';
import { PlayerId } from '../../game/types';
import { JellyHandle } from '../jelly/types';

function getBotIds(): PlayerId[] {
  return useGameStore
    .getState()
    .entities.filter((e) => e.id !== PLAYER_ID)
    .map((e) => e.id);
}

/**
 * Drives every bot in the store while the calling screen is mounted: each move tick a bot steps
 * in a random legal direction, and each paint tick it paints its current cell. Bot ids are read
 * from the store on every tick, so a re-initialized match is picked up without restarting.
 */
export function useBotController(getJelly: (id: PlayerId) => JellyHandle | null) {
  useEffect(() => {
    const moveTimer = setInterval(() => {
      for (const botId of getBotIds()) {
        // Read fresh entities per bot so bots moving earlier in this tick block later ones.
        const direction = chooseBotDirection(useGameStore.getState().entities, botId);
        if (!direction) continue;
        useGameStore.getState().move(botId, direction);
        getJelly(botId)?.playMove(direction);
      }
    }, BOT_MOVE_INTERVAL_MS);

    const paintTimer = setInterval(() => {
      for (const botId of getBotIds()) {
        useGameStore.getState().paint(botId);
        getJelly(botId)?.playPaint();
      }
    }, BOT_PAINT_INTERVAL_MS);

    return () => {
      clearInterval(moveTimer);
      clearInterval(paintTimer);
    };
  }, [getJelly]);
}
