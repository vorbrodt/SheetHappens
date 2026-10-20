import { ComponentType } from 'react';
import Svg from 'react-native-svg';

import { GetInLineIcon } from './icons/GetInLineIcon';
import { GhostArmyIcon } from './icons/GhostArmyIcon';
import { JellyGoneBadIcon } from './icons/JellyGoneBadIcon';
import { JellyportIcon } from './icons/JellyportIcon';
import { JellysaurusIcon } from './icons/JellysaurusIcon';
import { ICON_VIEWBOX } from './icons/parts';
import { SpeedsterIcon } from './icons/SpeedsterIcon';

// Local stand-in; phase 8B switches to importing PowerUpKind from src/game/powerups/types.ts.
export type PowerUpKind =
  | 'jellysaurus'
  | 'getInLine'
  | 'ghostArmy'
  | 'speedster'
  | 'jellyGoneBad'
  | 'jellyport';

export const POWER_UP_ICON_KINDS: PowerUpKind[] = [
  'jellysaurus',
  'getInLine',
  'ghostArmy',
  'speedster',
  'jellyGoneBad',
  'jellyport',
];

const ICONS: Record<PowerUpKind, ComponentType> = {
  jellysaurus: JellysaurusIcon,
  getInLine: GetInLineIcon,
  ghostArmy: GhostArmyIcon,
  speedster: SpeedsterIcon,
  jellyGoneBad: JellyGoneBadIcon,
  jellyport: JellyportIcon,
};

interface PowerUpIconProps {
  kind: PowerUpKind;
  size: number;
}

export function PowerUpIcon({ kind, size }: PowerUpIconProps) {
  const Icon = ICONS[kind];

  return (
    <Svg width={size} height={size} viewBox={ICON_VIEWBOX}>
      <Icon />
    </Svg>
  );
}
