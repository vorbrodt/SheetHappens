import { ComponentType } from 'react';
import Svg from 'react-native-svg';

import { PowerUpKind } from '../../game/powerups/types';
import { GetInLineIcon } from './icons/GetInLineIcon';
import { GhostArmyIcon } from './icons/GhostArmyIcon';
import { JellyGoneBadIcon } from './icons/JellyGoneBadIcon';
import { JellyportIcon } from './icons/JellyportIcon';
import { JellysaurusIcon } from './icons/JellysaurusIcon';
import { ICON_VIEWBOX } from './icons/parts';
import { SpeedsterIcon } from './icons/SpeedsterIcon';

const ICONS: Record<PowerUpKind, ComponentType> = {
  jellysaurus: JellysaurusIcon,
  getInLine: GetInLineIcon,
  ghostArmy: GhostArmyIcon,
  speedster: SpeedsterIcon,
  jellyGoneBad: JellyGoneBadIcon,
  jellyport: JellyportIcon,
};

// What each power-up is called on screen and to screen readers.
export const POWER_UP_NAMES: Record<PowerUpKind, string> = {
  jellysaurus: 'Jellysaurus',
  getInLine: 'Get in Line',
  ghostArmy: 'Ghost Army',
  speedster: 'Speedster',
  jellyGoneBad: 'Jelly Gone Bad',
  jellyport: 'Jellyport',
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
