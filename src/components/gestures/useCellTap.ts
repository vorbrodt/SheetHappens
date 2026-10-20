import { RefObject, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';

import { Position } from '../../game/types';
import { cellAtPoint, Point } from './cellAtPoint';

// A tap is a quick touch that barely moves; anything longer or further is left to the swipe.
const TAP_MAX_DURATION_MS = 250;
const TAP_MAX_DISTANCE = 10;

// Where the board sits on the touch surface the gesture is attached to.
export interface BoardFrame {
  // The board's top-left corner.
  origin: Point;
  // Its width (and height; boards are square).
  size: number;
}

interface UseCellTapOptions {
  enabled: boolean;
  gridSize: number;
  // Null until the board has been laid out.
  board: RefObject<BoardFrame | null>;
  // Called with the cell under a tap; taps off the board are ignored.
  onCellTap: (cell: Position) => void;
}

// A tap on a board cell. Race it against the swipe so a quick tap taps and a drag still swipes.
export function useCellTap({ enabled, gridSize, board, onCellTap }: UseCellTapOptions) {
  return useMemo(
    () =>
      Gesture.Tap()
        .enabled(enabled)
        .runOnJS(true)
        .maxDuration(TAP_MAX_DURATION_MS)
        .maxDistance(TAP_MAX_DISTANCE)
        .onEnd((event, success) => {
          const frame = board.current;
          if (!success || !frame) return;
          const cell = cellAtPoint({ x: event.x, y: event.y }, frame.origin, frame.size / gridSize, gridSize);
          if (cell) onCellTap(cell);
        }),
    [enabled, gridSize, board, onCellTap]
  );
}
