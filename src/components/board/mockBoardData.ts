import { CellData } from './types';

const BOARD_SIZE = 8;

function emptyRow(): CellData[] {
  return Array.from({ length: BOARD_SIZE }, () => ({ owner: null, intensity: 0 }));
}

export const mockBoardData: CellData[][] = Array.from({ length: BOARD_SIZE }, () => emptyRow());

// Row 0: player 1 intensity gradient across the row, faint to fully saturated.
mockBoardData[0] = mockBoardData[0].map((_, col) => ({
  owner: 'p1',
  intensity: Math.round(((col + 1) / BOARD_SIZE) * 100),
}));

// Row 2: player 2 intensity gradient across the row.
mockBoardData[2] = mockBoardData[2].map((_, col) => ({
  owner: 'p2',
  intensity: Math.round(((col + 1) / BOARD_SIZE) * 100),
}));

// A few scattered single cells for the remaining owners/intensities.
mockBoardData[4][1] = { owner: 'p3', intensity: 40 };
mockBoardData[4][6] = { owner: 'p4', intensity: 90 };
mockBoardData[6][3] = { owner: 'p1', intensity: 65 };
mockBoardData[6][4] = { owner: 'p2', intensity: 15 };
