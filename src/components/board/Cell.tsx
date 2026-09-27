import { StyleSheet, View } from 'react-native';

import { getCellColor } from './cellColor';
import { PlayerId } from './types';

interface CellProps {
  owner: PlayerId | null;
  intensity: number;
  size: number;
}

export function Cell({ owner, intensity, size }: CellProps) {
  return (
    <View
      style={[
        styles.cell,
        { width: size, height: size, backgroundColor: getCellColor(owner, intensity) },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
  },
});
