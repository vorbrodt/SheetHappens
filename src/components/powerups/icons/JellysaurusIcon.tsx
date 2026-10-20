import { Path } from 'react-native-svg';

import { Eyes, JellyBlob, OUTLINE, OUTLINE_WIDTH } from './parts';

// Dino spikes fanned around the top of the dome; their bases tuck under the body.
const SPIKES = [
  'M13.6 29.4 L6.4 19.7 L18.4 20.6 Z',
  'M19 19.8 L16 7 L27 14.2 Z',
  'M26 16 L32 2 L38 16 Z',
  'M37 14.2 L48 7 L45 19.8 Z',
  'M45.6 20.6 L57.6 19.7 L50.4 29.4 Z',
];

export function JellysaurusIcon() {
  return (
    <>
      {SPIKES.map((d) => (
        <Path
          key={d}
          d={d}
          fill="#15803D"
          stroke={OUTLINE}
          strokeWidth={OUTLINE_WIDTH}
          strokeLinejoin="round"
        />
      ))}
      <JellyBlob fill="#4ADE80" />
      <Eyes left={[25, 33]} right={[39, 33]} />
      {/* Roaring mouth with two fangs. */}
      <Path
        d="M23 42 Q32 40 41 42 Q38 52 32 52 Q26 52 23 42 Z"
        fill={OUTLINE}
        stroke={OUTLINE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M26 42 L28 46.5 L30 41.6 Z M34 41.6 L36 46.5 L38 42 Z" fill="#fff" />
    </>
  );
}
