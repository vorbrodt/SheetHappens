import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { EVIL_AURA, EvilLook } from './useEvilLook';

// The aura's diameter, in jelly sizes.
const AURA_SCALE = 1.7;

interface EvilAuraProps {
  size: number;
  look: EvilLook;
}

// A dark glow behind the evil jelly that swells in, breathes with its wobble, flickers, and
// implodes when the power-up runs out.
export function EvilAura({ size, look: { aura, flicker, wobble } }: EvilAuraProps) {
  const diameter = size * AURA_SCALE;
  const offset = (size - diameter) / 2;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, aura.value) * (0.55 + 0.45 * flicker.value),
    transform: [{ scale: Math.max(0, aura.value) * (0.92 + 0.12 * wobble.value) }],
  }));

  return (
    <Animated.View
      style={[styles.aura, { left: offset, top: offset, width: diameter, height: diameter }, animatedStyle]}
      pointerEvents="none"
    >
      <Svg width={diameter} height={diameter}>
        <Defs>
          <RadialGradient id="evilAura" cx="50%" cy="50%" r="50%">
            <Stop offset="0.45" stopColor={EVIL_AURA} stopOpacity={0.85} />
            <Stop offset="0.75" stopColor={EVIL_AURA} stopOpacity={0.35} />
            <Stop offset="1" stopColor={EVIL_AURA} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={diameter / 2} cy={diameter / 2} r={diameter / 2} fill="url(#evilAura)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  aura: {
    position: 'absolute',
  },
});
