import { Path } from 'react-native-svg';

import { Eyes, JellyBlob, OUTLINE, OUTLINE_WIDTH } from './parts';

const HORNS = ['M17 22 Q10 12 13 3 Q20 10 27 16 Z', 'M47 22 Q54 12 51 3 Q44 10 37 16 Z'];

export function JellyGoneBadIcon() {
  return (
    <>
      {HORNS.map((d) => (
        <Path
          key={d}
          d={d}
          fill="#DC2626"
          stroke={OUTLINE}
          strokeWidth={OUTLINE_WIDTH}
          strokeLinejoin="round"
        />
      ))}
      <JellyBlob fill="#7E22CE" />
      {/* Red eyes ringed in outline so they glow against the dark body. */}
      <Eyes left={[25, 35]} right={[39, 35]} r={5} fill={OUTLINE} glint={false} />
      <Eyes left={[25, 35]} right={[39, 35]} r={3.5} fill="#F43F5E" glint={false} />
      {/* Angry brows slanting down toward the middle. */}
      <Path
        d="M18 25 L29 30 M46 25 L35 30"
        stroke={OUTLINE}
        strokeWidth={OUTLINE_WIDTH + 1}
        strokeLinecap="round"
      />
      {/* Jagged scowl. */}
      <Path
        d="M23 48 L27.5 44.5 L32 48 L36.5 44.5 L41 48"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={OUTLINE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}
