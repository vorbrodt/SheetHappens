import { useWindowDimensions } from 'react-native';

import { BOARD_SIZE } from '../../game/rules';

const BOARD_HORIZONTAL_PADDING = 16;

export interface BoardLayout {
  boardWidth: number;
  cellSize: number;
}

export function useBoardLayout(): BoardLayout {
  const { width } = useWindowDimensions();
  const boardWidth = width - BOARD_HORIZONTAL_PADDING * 2;
  const cellSize = boardWidth / BOARD_SIZE;

  return { boardWidth, cellSize };
}
