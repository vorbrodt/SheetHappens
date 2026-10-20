import { PassThroughSkin } from '../PassThroughSkin';
import { SkinProps } from '../types';

// Stub: the Jellysaurus look comes in Phase 9. Until then the entity looks like it normally does.
export function JellysaurusSkin(props: SkinProps) {
  return <PassThroughSkin {...props} />;
}
