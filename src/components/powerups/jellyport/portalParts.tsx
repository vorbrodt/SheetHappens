import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { sparklePath } from '../icons/parts';

// The same purples and sparkle yellow as the Jellyport icon.
export const PORTAL_RIM = '#7C3AED';
export const PORTAL_LIGHT = '#A78BFA';
export const PORTAL_PALE = '#EDE9FE';
export const SPARKLE = '#FDE047';

const SPARKLE_PATH = sparklePath(10, 10, 9.5);

interface SparkleProps {
  size: number;
  color?: string;
}

// A four-pointed twinkle, drawn the way the icons draw theirs.
export function Sparkle({ size, color = SPARKLE }: SparkleProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d={SPARKLE_PATH} fill={color} />
    </Svg>
  );
}

// Each ring of a swirl, as a share of its size, with its color and which way it turns.
const RINGS = [
  { ratio: 1, color: PORTAL_RIM, turn: 1 },
  { ratio: 0.72, color: PORTAL_LIGHT, turn: -1.4 },
  { ratio: 0.46, color: PORTAL_PALE, turn: 1.9 },
];

interface PortalSwirlProps {
  // Width and height of the square the swirl is centered in.
  size: number;
  // 0 hides the swirl; 1 shows it fully open.
  amount: SharedValue<number>;
  // How far the rings have turned, in radians.
  spin: SharedValue<number>;
}

// A portal: open-ended rings turning against each other, opening up with `amount`.
export function PortalSwirl({ size, amount, spin }: PortalSwirlProps) {
  return (
    <View style={[styles.square, { width: size, height: size }]} pointerEvents="none">
      {RINGS.map((ring) => (
        <SwirlRing key={ring.ratio} {...ring} size={size} amount={amount} spin={spin} />
      ))}
    </View>
  );
}

interface SwirlRingProps extends PortalSwirlProps {
  ratio: number;
  color: string;
  turn: number;
}

function SwirlRing({ size, ratio, color, turn, amount, spin }: SwirlRingProps) {
  const diameter = size * ratio;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: amount.value,
    transform: [{ rotate: `${spin.value * turn}rad` }, { scale: 0.3 + 0.7 * amount.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderWidth: Math.max(2, diameter * 0.09),
          // Three sides colored, so the ring reads as an arc spiralling round.
          borderTopColor: color,
          borderRightColor: color,
          borderBottomColor: color,
          left: (size - diameter) / 2,
          top: (size - diameter) / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

interface SparkleBurstProps {
  // Width and height of the square the burst starts from the center of.
  size: number;
  count: number;
  // How far the sparkles fly, from the center.
  reach: number;
  sparkleSize: number;
  // 0 → 1 over one burst; the sparkles are hidden at either end.
  progress: SharedValue<number>;
  // Turns the whole burst, in radians.
  angleOffset?: number;
}

// Sparkles flying out from the center and twinkling away.
export function SparkleBurst({ size, count, reach, sparkleSize, progress, angleOffset = 0 }: SparkleBurstProps) {
  return (
    <View style={[styles.square, { width: size, height: size }]} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <BurstSparkle
          key={i}
          angle={angleOffset + (i / count) * Math.PI * 2}
          // Every other sparkle is smaller and stops shorter, so the burst isn't a perfect ring.
          reach={reach * (i % 2 ? 0.75 : 1)}
          sparkleSize={sparkleSize * (i % 2 ? 0.7 : 1)}
          center={size / 2}
          progress={progress}
        />
      ))}
    </View>
  );
}

interface BurstSparkleProps {
  angle: number;
  reach: number;
  sparkleSize: number;
  center: number;
  progress: SharedValue<number>;
}

function BurstSparkle({ angle, reach, sparkleSize, center, progress }: BurstSparkleProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const out = 1 - (1 - p) * (1 - p);
    return {
      opacity: p <= 0 || p >= 1 ? 0 : interpolate(p, [0, 0.15, 0.65, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * reach * out },
        { translateY: Math.sin(angle) * reach * out },
        { rotate: `${p * Math.PI}rad` },
        { scale: interpolate(p, [0, 0.3, 1], [0.3, 1.1, 0.4]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.piece, { left: center - sparkleSize / 2, top: center - sparkleSize / 2 }, animatedStyle]}
    >
      <Sparkle size={sparkleSize} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  square: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ring: {
    position: 'absolute',
    borderLeftColor: 'transparent',
  },
  piece: {
    position: 'absolute',
  },
});
