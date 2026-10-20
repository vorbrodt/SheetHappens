import { G } from 'react-native-svg';

import { Eyes, JellyBlob } from './parts';

const JELLY_SCALE = 0.5;
// The four jellies climb diagonally from bottom-left to top-right, each overlapping the one ahead.
const JELLY_STEP_X = 13.3;
const JELLY_STEP_Y = -10;
const FIRST_JELLY_LEFT = 1;
const FIRST_JELLY_TOP = 40;
// Alternate shades so the overlapping jellies stay separable at pickup size.
const JELLY_FILLS = ['#93C5FD', '#3B82F6', '#93C5FD', '#3B82F6'];

export function GetInLineIcon() {
  // Drawn leader-first (top-right) so each follower overlaps the one ahead of it.
  return (
    <>
      {[3, 2, 1, 0].map((index) => {
        // Offsets account for the body path's own 10,14 origin.
        const x = FIRST_JELLY_LEFT + index * JELLY_STEP_X - 10 * JELLY_SCALE;
        const y = FIRST_JELLY_TOP + index * JELLY_STEP_Y - 14 * JELLY_SCALE;

        return (
          <G key={index} transform={`translate(${x} ${y}) scale(${JELLY_SCALE})`}>
            <JellyBlob fill={JELLY_FILLS[index]} strokeWidth={5} highlight={null} />
            <Eyes left={[34, 33]} right={[45, 33]} r={5} glint={false} />
          </G>
        );
      })}
    </>
  );
}
