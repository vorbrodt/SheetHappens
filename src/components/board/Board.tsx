import { StyleSheet, View } from 'react-native';

import { Cell } from './Cell';
import { CellData, PlayerId } from './types';
import { useBoardLayout } from './useBoardLayout';

interface BoardProps {
  cells: CellData[][];
  ownerColors: Record<PlayerId, string>;
}

export function Board({ cells, ownerColors }: BoardProps) {
  const { boardWidth, cellSize } = useBoardLayout(cells.length);

  return (
    <View style={[styles.board, { width: boardWidth, height: boardWidth }]}>
      {cells.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => (
            <Cell
              key={colIndex}
              ownerColor={cell.owner ? (ownerColors[cell.owner] ?? null) : null}
              intensity={cell.intensity}
              size={cellSize}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
  },
  row: {
    flexDirection: 'row',
  },
});
