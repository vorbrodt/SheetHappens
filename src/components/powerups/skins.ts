import { ComponentType } from 'react';

import { PowerUpKind } from '../../game/powerups/types';
import { GetInLineSkin } from './getInLine/GetInLineSkin';
import { GhostArmySkin } from './ghostArmy/GhostArmySkin';
import { JellyGoneBadSkin } from './jellyGoneBad/JellyGoneBadSkin';
import { JellyportSkin } from './jellyport/JellyportSkin';
import { JellysaurusSkin } from './jellysaurus/JellysaurusSkin';
import { SpeedsterSkin } from './speedster/SpeedsterSkin';
import { SkinProps } from './types';

/**
 * How an entity looks while each kind of power-up runs on it. A registered skin draws the whole
 * entity; a kind without one keeps the normal jelly. Each kind's skin lives in its own folder.
 */
export const POWER_UP_SKINS: Partial<Record<PowerUpKind, ComponentType<SkinProps>>> = {
  jellysaurus: JellysaurusSkin,
  getInLine: GetInLineSkin,
  ghostArmy: GhostArmySkin,
  speedster: SpeedsterSkin,
  jellyGoneBad: JellyGoneBadSkin,
  jellyport: JellyportSkin,
};

// How long a skin stays in its 'activating' phase after the power-up starts, on the match clock.
export const SKIN_ACTIVATING_MS = 400;

// The longest a skin can stay 'expiring' before the entity goes back to normal without it.
export const SKIN_EXIT_TIMEOUT_MS = 2_000;
