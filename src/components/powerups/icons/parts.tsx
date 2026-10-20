import { Circle, Path } from 'react-native-svg';

// Every icon is drawn on a 64x64 viewBox with the same outline so the set reads as one family
// at both the board pickup (~28 px) and inventory slot (~56 px) sizes.
export const ICON_VIEWBOX = '0 0 64 64';
export const OUTLINE = '#1F2933';
export const OUTLINE_WIDTH = 3;

// A gumdrop jelly spanning x 10..54, y 14..58.
export const JELLY_BODY_PATH =
  'M10 54 C10 30 19 14 32 14 C45 14 54 30 54 54 Q54 58 50 58 L14 58 Q10 58 10 54 Z';
const JELLY_HIGHLIGHT_PATH = 'M17 42 C17 32 20 25 25 21';

interface JellyBlobProps {
  fill: string;
  d?: string;
  highlight?: string | null;
  strokeWidth?: number;
  fillOpacity?: number;
  strokeOpacity?: number;
}

export function JellyBlob({
  fill,
  d = JELLY_BODY_PATH,
  highlight = JELLY_HIGHLIGHT_PATH,
  strokeWidth = OUTLINE_WIDTH,
  fillOpacity,
  strokeOpacity,
}: JellyBlobProps) {
  return (
    <>
      <Path
        d={d}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={OUTLINE}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {highlight && (
        <Path
          d={highlight}
          fill="none"
          stroke="#fff"
          strokeOpacity={0.6}
          strokeWidth={strokeWidth * 1.3}
          strokeLinecap="round"
        />
      )}
    </>
  );
}

interface EyesProps {
  left: [number, number];
  right: [number, number];
  r?: number;
  fill?: string;
  glint?: boolean;
}

export function Eyes({ left, right, r = 3.5, fill = OUTLINE, glint = true }: EyesProps) {
  return (
    <>
      {[left, right].map(([cx, cy]) => (
        <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} />
      ))}
      {glint &&
        [left, right].map(([cx, cy]) => (
          <Circle key={`glint-${cx}-${cy}`} cx={cx + r * 0.35} cy={cy - r * 0.35} r={r * 0.35} fill="#fff" />
        ))}
    </>
  );
}

// A four-point sparkle centred on (cx, cy).
export function sparklePath(cx: number, cy: number, r: number) {
  return (
    `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} ` +
    `Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`
  );
}
