import { Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { Jelly } from '../jelly/Jelly';
import { JellyHandle } from '../jelly/types';
import { useBoardLayout } from './useBoardLayout';

export interface BoardEntityViewModel {
  id: string;
  color: string;
  position: { row: number; col: number };
  ref?: Ref<JellyHandle>;
}

interface BoardEntityLayerProps {
  entities: BoardEntityViewModel[];
}

export function BoardEntityLayer({ entities }: BoardEntityLayerProps) {
  const { cellSize } = useBoardLayout();
  const jellySize = cellSize * 0.8;
  const jellyInset = (cellSize - jellySize) / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {entities.map((entity) => (
        <View
          key={entity.id}
          style={{
            position: 'absolute',
            top: entity.position.row * cellSize + jellyInset,
            left: entity.position.col * cellSize + jellyInset,
          }}
        >
          <Jelly ref={entity.ref} color={entity.color} size={jellySize} />
        </View>
      ))}
    </View>
  );
}
