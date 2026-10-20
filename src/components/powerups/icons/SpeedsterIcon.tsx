import { Path } from 'react-native-svg';

import { Eyes, JellyBlob, OUTLINE, OUTLINE_WIDTH } from './parts';

// The jelly leans forward (to the right), leaving the top-left free for the bolt.
const LEANING_BODY_PATH =
  'M14 56 C16 32 26 16 40 16 C52 16 58 30 56 56 Q56 60 52 60 L18 60 Q14 60 14 56 Z';
const LEANING_HIGHLIGHT = 'M21 44 C22 34 25 27 30 23';
const BOLT_PATH = 'M14 2 L5 14 L11 14 L7 24 L19 10 L13 10 L17 2 Z';
const SPEED_LINES = 'M3 32 L12 32 M1 41 L10 41 M4 50 L10 50';

export function SpeedsterIcon() {
  return (
    <>
      <Path
        d={SPEED_LINES}
        stroke={OUTLINE}
        strokeWidth={OUTLINE_WIDTH + 0.5}
        strokeLinecap="round"
      />
      <JellyBlob d={LEANING_BODY_PATH} highlight={LEANING_HIGHLIGHT} fill="#FB923C" />
      <Eyes left={[38, 32]} right={[49, 32]} />
      {/* Determined grin. */}
      <Path
        d="M37 43 Q43 48 50 42"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={OUTLINE_WIDTH}
        strokeLinecap="round"
      />
      <Path
        d={BOLT_PATH}
        fill="#FDE047"
        stroke={OUTLINE}
        strokeWidth={OUTLINE_WIDTH * 0.8}
        strokeLinejoin="round"
      />
    </>
  );
}
