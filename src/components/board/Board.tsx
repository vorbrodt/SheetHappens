import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Cell } from './Cell';
import { CellData } from './types';

const BOARD_SIZE = 8;
const BOARD_HORIZONTAL_PADDING = 16;

interface BoardProps {
  cells: CellData[][];
}

export function Board({ cells }: BoardProps) {
  const { width } = useWindowDimensions();
  const boardWidth = width - BOARD_HORIZONTAL_PADDING * 2;
  const cellSize = boardWidth / BOARD_SIZE;

  return (
    <View style={[styles.board, { width: boardWidth, height: boardWidth }]}>
      {cells.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => (
            <Cell key={colIndex} owner={cell.owner} intensity={cell.intensity} size={cellSize} />
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
