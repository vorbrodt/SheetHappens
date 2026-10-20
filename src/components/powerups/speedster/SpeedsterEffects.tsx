import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { OUTLINE } from '../icons/parts';
import { runningOutFlicker } from './speedsterMotion';

const BOLT_PATH = 'M14 2 L5 14 L11 14 L7 24 L19 10 L13 10 L17 2 Z';
const BOLT_VIEWBOX = '4 1 16 24';
const BOLT_YELLOW = '#FDE047';
const DUST = '#CBBFAE';

const BURST_LINE_ANGLES = [30, 90, 150, 210, 270, 330];
const SPARKLES = [
  { x: 0.2, y: -0.3, delay: 0.15 },
  { x: 1.05, y: -0.1, delay: 0.3 },
  { x: 0.95, y: -0.65, delay: 0.45 },
];
const WIND_LINE_COUNT = 3;
const WIND_PERIOD_MS = 650;
const DUST_PUFF_COUNT = 4;

// Everything here is laid out on the jelly's own size x size box.

interface ActivationBurstProps {
  size: number;
  // 0 before the burst, running to 1 as it plays out.
  burst: SharedValue<number>;
}

// The "zoom" as Speedster kicks in: speed lines shooting outwards, a lightning bolt and sparkles.
export function ActivationBurst({ size, burst }: ActivationBurstProps) {
  const boltSize = size * 0.55;
  const boltStyle = useAnimatedStyle(() => {
    const t = burst.value;
    return {
      opacity: t > 0 && t < 1 ? 1 : 0,
      transform: [
        { scale: interpolate(t, [0, 0.3, 0.75, 1], [0, 1.25, 1, 0], Extrapolation.CLAMP) },
        { rotate: `${interpolate(t, [0, 1], [-25, 10])}deg` },
      ],
    };
  });

  return (
    <>
      <View style={[styles.center, { left: size / 2, top: size / 2 }]}>
        {BURST_LINE_ANGLES.map((angle) => (
          <BurstLine key={angle} angle={angle} size={size} burst={burst} />
        ))}
      </View>
      {SPARKLES.map((sparkle) => (
        <Sparkle key={sparkle.delay} {...sparkle} size={size} burst={burst} />
      ))}
      <Animated.View
        style={[styles.piece, { left: size * 0.6, top: -size * 0.6, width: boltSize, height: boltSize }, boltStyle]}
      >
        <Svg width={boltSize} height={boltSize} viewBox={BOLT_VIEWBOX}>
          <Path d={BOLT_PATH} fill={BOLT_YELLOW} stroke={OUTLINE} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </>
  );
}

function BurstLine({ angle, size, burst }: ActivationBurstProps & { angle: number }) {
  const thickness = Math.max(2, size * 0.07);
  const style = useAnimatedStyle(() => {
    const t = burst.value;
    const length = size * 0.32 * (1 - t * 0.5);
    // How far its middle is from the jelly's.
    const reach = size * (0.45 + 0.5 * t) + length / 2;
    const radians = (angle * Math.PI) / 180;
    return {
      opacity: interpolate(t, [0, 0.1, 1], [0, 1, 0], Extrapolation.CLAMP),
      width: length,
      transform: [
        { translateX: Math.cos(radians) * reach - length / 2 },
        { translateY: Math.sin(radians) * reach - thickness / 2 },
        { rotate: `${angle}deg` },
      ],
    };
  });
  return <Animated.View style={[styles.piece, styles.burstLine, { height: thickness }, style]} />;
}

interface SparkleProps extends ActivationBurstProps {
  // Where it twinkles, in jelly sizes from the box's top-left.
  x: number;
  y: number;
  // When in the burst it peaks, 0-1.
  delay: number;
}

function Sparkle({ x, y, delay, size, burst }: SparkleProps) {
  const dot = size * 0.14;
  const style = useAnimatedStyle(() => {
    const scale = interpolate(burst.value, [delay, delay + 0.2, delay + 0.45], [0, 1, 0], Extrapolation.CLAMP);
    return { opacity: scale > 0 ? 1 : 0, transform: [{ scale }, { rotate: '45deg' }] };
  });
  return (
    <Animated.View
      style={[styles.piece, styles.sparkle, { left: x * size, top: y * size, width: dot, height: dot }, style]}
    />
  );
}

interface WindLinesProps {
  size: number;
  headingX: SharedValue<number>;
  headingY: SharedValue<number>;
  // How streamlined the jelly is, 0-1; the wind lines only show while it is.
  streamline: SharedValue<number>;
  remainingMs: SharedValue<number>;
}

// Little gusts streaming off the back of the jelly while Speedster runs, flickering as it runs out.
export function WindLines(props: WindLinesProps) {
  const { size, headingX, headingY } = props;
  const wind = useSharedValue(0);

  useEffect(() => {
    wind.set(withRepeat(withTiming(1, { duration: WIND_PERIOD_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(wind);
  }, [wind]);

  // Turned so its +x points along the heading.
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.atan2(headingY.value, headingX.value)}rad` }],
  }));

  return (
    <Animated.View style={[styles.center, { left: size / 2, top: size / 2 }, style]}>
      {Array.from({ length: WIND_LINE_COUNT }, (_, index) => (
        <WindLine key={index} index={index} wind={wind} {...props} />
      ))}
    </Animated.View>
  );
}

function WindLine({ index, wind, size, streamline, remainingMs }: WindLinesProps & { index: number; wind: SharedValue<number> }) {
  const length = size * 0.28;
  const thickness = Math.max(2, size * 0.05);
  const style = useAnimatedStyle(() => {
    const t = (wind.value + index / WIND_LINE_COUNT) % 1;
    return {
      opacity: Math.sin(Math.PI * t) * 0.85 * streamline.value * runningOutFlicker(remainingMs.value),
      transform: [
        { translateX: -(size * 0.45 + length + t * size * 0.4) },
        { translateY: (index - (WIND_LINE_COUNT - 1) / 2) * size * 0.24 - thickness / 2 },
        { scaleX: 1 - t * 0.4 },
      ],
    };
  });
  return <Animated.View style={[styles.piece, styles.windLine, { width: length, height: thickness }, style]} />;
}

interface DustPuffProps {
  size: number;
  headingX: SharedValue<number>;
  headingY: SharedValue<number>;
  // 0 before the puff, running to 1 as it settles.
  dust: SharedValue<number>;
}

// The cloud kicked up behind the jelly's feet as it skids to a stop.
export function DustPuff(props: DustPuffProps) {
  return Array.from({ length: DUST_PUFF_COUNT }, (_, index) => <Puff key={index} index={index} {...props} />);
}

function Puff({ index, size, headingX, headingY, dust }: DustPuffProps & { index: number }) {
  const style = useAnimatedStyle(() => {
    const t = dust.value;
    const radius = size * (0.09 + 0.11 * t);
    const spread = index - (DUST_PUFF_COUNT - 1) / 2;
    // From the back of its feet, fanning out and drifting up.
    const x = size / 2 - headingX.value * size * (0.3 + 0.25 * t) + spread * size * 0.2 * t;
    const y = size * 0.9 - headingY.value * size * (0.3 + 0.25 * t) - size * (index % 2 === 0 ? 0.2 : 0.1) * t;
    return {
      opacity: interpolate(t, [0, 0.15, 1], [0, 0.85, 0], Extrapolation.CLAMP),
      width: radius * 2,
      height: radius * 2,
      borderRadius: radius,
      transform: [{ translateX: x - radius }, { translateY: y - radius }],
    };
  });
  return <Animated.View style={[styles.piece, styles.dust, style]} />;
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // A zero-size anchor on the jelly's middle that its children are laid out and turned around.
  center: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  burstLine: {
    backgroundColor: BOLT_YELLOW,
    borderRadius: 2,
  },
  sparkle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BOLT_YELLOW,
    borderRadius: 2,
  },
  windLine: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  dust: {
    backgroundColor: DUST,
  },
});
