import { useEffect } from 'react';

import { BoardJelly } from '../board/BoardJelly';
import { SkinProps } from './types';

// A skin that changes nothing: the normal jelly, handed straight back once the power-up expires.
export function PassThroughSkin({ entity, cellSize, jellyRef, phase, onExitDone }: SkinProps) {
  useEffect(() => {
    if (phase === 'expiring') onExitDone();
  }, [phase, onExitDone]);

  return <BoardJelly jellyRef={jellyRef} color={entity.color} position={entity.position} cellSize={cellSize} />;
}
