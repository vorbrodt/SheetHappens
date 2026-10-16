import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

import { BOARD_SIZE } from '../../game/rules';

const BOARD_PADDING = 16;

export interface BoardSpace {
  width: number;
  height: number;
}

// The area a screen has set aside for the board. Without one the board fills the window width.
const BoardSpaceContext = createContext<BoardSpace | null>(null);
export const BoardSpaceProvider = BoardSpaceContext.Provider;

export interface BoardLayout {
  boardWidth: number;
  cellSize: number;
}

export function useBoardLayout(): BoardLayout {
  const window = useWindowDimensions();
  const space = useContext(BoardSpaceContext) ?? { width: window.width, height: Infinity };
  // The board stays square, so the shorter side decides its size (short phones, iPad portrait).
  const boardWidth = Math.max(0, Math.min(space.width, space.height) - BOARD_PADDING * 2);
  const cellSize = boardWidth / BOARD_SIZE;

  return { boardWidth, cellSize };
}
