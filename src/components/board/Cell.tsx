import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { getCellColor } from './cellColor';

interface CellProps {
  ownerColor: string | null;
  intensity: number;
  size: number;
}

// Memoized so a paint tap only re-renders the one cell that changed.
export const Cell = memo(function Cell({ ownerColor, intensity, size }: CellProps) {
  return (
    <View
      style={[
        styles.cell,
        { width: size, height: size, backgroundColor: getCellColor(ownerColor, intensity) },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
  },
});
