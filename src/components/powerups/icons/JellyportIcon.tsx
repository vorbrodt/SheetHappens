import { Ellipse, G, Path } from 'react-native-svg';

import { Eyes, JellyBlob, OUTLINE, OUTLINE_WIDTH, sparklePath } from './parts';

const PORTAL_RIM = '#7C3AED';
// The near half of the portal ring, drawn over the jelly so it looks like it stands inside it.
const PORTAL_FRONT_LIP = 'M4 52 A28 9 0 0 0 60 52 L52 52 A20 6 0 0 1 12 52 Z';
const SPARKLES = [sparklePath(8, 16, 6), sparklePath(56, 13, 6), sparklePath(57, 35, 4)];

export function JellyportIcon() {
  return (
    <>
      <Ellipse cx={32} cy={52} rx={28} ry={9} fill={PORTAL_RIM} stroke={OUTLINE} strokeWidth={OUTLINE_WIDTH} />
      <Ellipse cx={32} cy={52} rx={20} ry={6} fill="#A78BFA" />
      <Ellipse cx={32} cy={52} rx={11} ry={3.5} fill="#EDE9FE" />
      <G transform="translate(8 8.5) scale(0.75)">
        <JellyBlob fill="#2DD4BF" strokeWidth={4} />
        <Eyes left={[25, 33]} right={[39, 33]} r={4.5} />
      </G>
      <Path
        d={PORTAL_FRONT_LIP}
        fill={PORTAL_RIM}
        stroke={OUTLINE}
        strokeWidth={OUTLINE_WIDTH}
        strokeLinejoin="round"
      />
      {SPARKLES.map((d) => (
        <Path key={d} d={d} fill="#FDE047" stroke={OUTLINE} strokeWidth={1.5} strokeLinejoin="round" />
      ))}
    </>
  );
}
