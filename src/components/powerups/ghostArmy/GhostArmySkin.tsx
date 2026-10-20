import { SkinProps } from '../types';
import { ArmyOwnerSkin } from './ArmyOwnerSkin';
import { GhostSkin } from './GhostSkin';

// Ghost Army is worn both by the jelly that used it and by the ghosts it summoned (see the engine's
// ghostArmy), so this draws each the way it should look.
export function GhostArmySkin(props: SkinProps) {
  const { ghost, summonedBy } = props.entity;
  return ghost && summonedBy !== null ? <GhostSkin {...props} /> : <ArmyOwnerSkin {...props} />;
}
