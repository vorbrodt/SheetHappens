import { StyleSheet } from 'react-native';
import Animated, { interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { OUTLINE } from '../icons/parts';

// The jelly body's corner radius as a share of its size (see Jelly).
const BODY_RADIUS = 0.38;

// How far each spike's base tucks under the body, as a share of the body's size.
const TUCK = 0.07;

// Tail to head along the top of the body: where each spike stands (a share of the body's width),
// its size (shares of the body's size) and how far it leans out.
const SPIKES = [
  { at: 0.16, width: 0.18, height: 0.17, angle: -38 },
  { at: 0.33, width: 0.2, height: 0.22, angle: -16 },
  { at: 0.5, width: 0.2, height: 0.25, angle: 0 },
  { at: 0.67, width: 0.2, height: 0.22, angle: 16 },
  { at: 0.84, width: 0.18, height: 0.17, angle: 38 },
];

// The spikes pop one after another as the progress runs 0 → 1: each takes this share of it and
// starts this much after the one before.
const POP_SPAN = 0.6;
const POP_STAGGER = 0.1;

// Where the top edge of a rounded body sits at `x` across it, both as shares of its size.
function topEdge(x: number): number {
  const fromCorner = Math.max(0, BODY_RADIUS - Math.min(x, 1 - x));
  return BODY_RADIUS - Math.sqrt(BODY_RADIUS * BODY_RADIUS - fromCorner * fromCorner);
}

// A darker take on the jelly's color for its spikes.
function darken(hex: string, amount = 0.35): string {
  const value = parseInt(hex.replace('#', ''), 16);
  const channel = (shift: number) => Math.round(((value >> shift) & 0xff) * (1 - amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

interface SpikesProps {
  color: string;
  // The body's size, which the spikes line the top of.
  size: number;
  // 0 tucks every spike away, 1 has them all standing.
  progress: SharedValue<number>;
}

// Dino spikes along the jelly's back. Draw them before the body, so their bases sit behind it.
export function Spikes({ color, size, progress }: SpikesProps) {
  const fill = darken(color);
  return (
    <>
      {SPIKES.map((spike, index) => (
        <Spike key={index} index={index} {...spike} fill={fill} bodySize={size} progress={progress} />
      ))}
    </>
  );
}

interface SpikeProps {
  index: number;
  at: number;
  width: number;
  height: number;
  angle: number;
  fill: string;
  bodySize: number;
  progress: SharedValue<number>;
}

function Spike({ index, at, width, height, angle, fill, bodySize, progress }: SpikeProps) {
  const w = width * bodySize;
  const h = height * bodySize;
  const start = index * POP_STAGGER;

  const animatedStyle = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value - start) / POP_SPAN));
    return { transform: [{ rotate: `${angle}deg` }, { scale: interpolate(t, [0, 0.7, 1], [0, 1.25, 1]) }] };
  });

  return (
    <Animated.View
      style={[
        styles.spike,
        { left: at * bodySize - w / 2, top: (topEdge(at) + TUCK) * bodySize - h, width: w, height: h },
        animatedStyle,
      ]}
    >
      <Svg width={w} height={h} viewBox="0 0 10 12">
        <Path d="M0.8 12 L5 0.8 L9.2 12 Z" fill={fill} stroke={OUTLINE} strokeWidth={1} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spike: {
    position: 'absolute',
    // Spikes grow out of, and lean around, their base.
    transformOrigin: 'bottom',
  },
});
