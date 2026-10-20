import { Ellipse, G } from 'react-native-svg';

import { JellyBlob, OUTLINE } from './parts';

// A dome with a wavy hem, spanning x 12..52, y 10..~59.
const GHOST_PATH =
  'M12 56 L12 32 C12 19 21 10 32 10 C43 10 52 19 52 32 L52 56 ' +
  'Q47 50 42 56 Q37 62 32 56 Q27 50 22 56 Q17 62 12 56 Z';
const GHOST_HIGHLIGHT = 'M18 38 C18 28 21 21 26 18';
const GHOST_FILL = '#C4B5FD';

function Ghost({ strokeWidth, opacity }: { strokeWidth: number; opacity: number }) {
  return (
    <>
      <JellyBlob
        d={GHOST_PATH}
        highlight={GHOST_HIGHLIGHT}
        fill={GHOST_FILL}
        fillOpacity={opacity}
        strokeOpacity={opacity + 0.15}
        strokeWidth={strokeWidth}
      />
      <Ellipse cx={25} cy={30} rx={4} ry={5.5} fill={OUTLINE} fillOpacity={opacity + 0.2} />
      <Ellipse cx={39} cy={30} rx={4} ry={5.5} fill={OUTLINE} fillOpacity={opacity + 0.2} />
      <Ellipse cx={32} cy={42} rx={3} ry={3.5} fill={OUTLINE} fillOpacity={opacity + 0.2} />
    </>
  );
}

export function GhostArmyIcon() {
  return (
    <>
      <G transform="translate(-4.6 0.5) scale(0.55)">
        <Ghost strokeWidth={4.4} opacity={0.45} />
      </G>
      <G transform="translate(33.4 0.5) scale(0.55)">
        <Ghost strokeWidth={4.4} opacity={0.45} />
      </G>
      <G transform="translate(4.8 11.8) scale(0.85)">
        <Ghost strokeWidth={3.5} opacity={0.75} />
      </G>
    </>
  );
}
