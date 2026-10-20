import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// How see-through a ghost's body is.
const BODY_OPACITY = 0.4;
const FACE = '#1F2933';
// One flutter of the hem, and one swell of the glow, on the match clock.
const HEM_PERIOD_MS = 1_100;
const GLOW_PERIOD_MS = 1_800;
// The glow reaches this far past the 64x64 body box on each side.
const GLOW_MARGIN = 16;

/**
 * A ghost's outline on a 64x64 viewBox: a dome over x 12..52, then a tattered hem whose points
 * flutter with `t` (radians).
 */
export function ghostPath(t: number): string {
  'worklet';
  let d = 'M12 50 L12 30 C12 18 21 9 32 9 C43 9 52 18 52 30 L52 50';
  // Down to a tip, up to a notch, and so on back to x 12.
  for (let i = 1; i <= 8; i++) {
    const x = 52 - i * 5;
    const y = i % 2 === 1 ? 57 + 2.5 * Math.sin(t + i * 0.8) : 50 + 1.5 * Math.sin(t * 1.3 + i);
    d += ` Q${x + 2.5} ${y.toFixed(2)} ${x} ${y.toFixed(2)}`;
  }
  return `${d} Z`;
}

// A phase offset in radians, the same for the same ghost every render.
export function seedFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return (hash / 997) * Math.PI * 2;
}

interface GhostBodyProps {
  color: string;
  // The body's width and height; the glow spills out past it.
  size: number;
  clock: SharedValue<number>;
  // Offsets the flutter, so ghosts side by side don't move in lockstep.
  seed: number;
}

// A translucent ghost of a jelly in `color`, with a soft glow, a fluttering hem and a sad, hollow face.
export function GhostBody({ color, size, clock, seed }: GhostBodyProps) {
  const glowId = `ghost-glow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const glowSize = (size * (64 + GLOW_MARGIN * 2)) / 64;

  const hemProps = useAnimatedProps(() => ({
    d: ghostPath((clock.value / HEM_PERIOD_MS) * Math.PI * 2 + seed),
  }));
  const glowProps = useAnimatedProps(() => ({
    opacity: 0.55 + 0.25 * Math.sin((clock.value / GLOW_PERIOD_MS) * Math.PI * 2 + seed),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={glowSize}
        height={glowSize}
        viewBox={`${-GLOW_MARGIN} ${-GLOW_MARGIN} ${64 + GLOW_MARGIN * 2} ${64 + GLOW_MARGIN * 2}`}
        style={[styles.glow, { left: (size - glowSize) / 2, top: (size - glowSize) / 2 }]}
      >
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.18} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <AnimatedCircle cx={32} cy={34} r={32 + GLOW_MARGIN} fill={`url(#${glowId})`} animatedProps={glowProps} />
        <AnimatedPath
          fill={color}
          fillOpacity={BODY_OPACITY}
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={2}
          strokeLinejoin="round"
          animatedProps={hemProps}
        />
        <Path d="M18 36 C18 26 21 19 26 16" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" />
        <G fill={FACE} fillOpacity={0.7}>
          {/* Eyes drooping at the outer corners, and a small "oo" mouth. */}
          <Ellipse cx={25} cy={29} rx={3.6} ry={5.4} rotation={-14} origin="25, 29" />
          <Ellipse cx={39} cy={29} rx={3.6} ry={5.4} rotation={14} origin="39, 29" />
          <Ellipse cx={32} cy={41} rx={2.6} ry={3.6} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
});
