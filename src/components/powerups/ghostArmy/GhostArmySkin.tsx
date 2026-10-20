import { PassThroughSkin } from '../PassThroughSkin';
import { SkinProps } from '../types';

// Stub: the GhostArmy look comes in Phase 9. Until then the entity looks like it normally does.
export function GhostArmySkin(props: SkinProps) {
  return <PassThroughSkin {...props} />;
}
