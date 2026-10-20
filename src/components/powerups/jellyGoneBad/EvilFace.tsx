import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { JellyFace } from '../../jelly/JellyFace';
import { EVIL_DARK, EVIL_RED, EvilLook } from './useEvilLook';

const TINT_OPACITY = 0.72;
const BROW_TILT_DEG = 24;
const HORN_TILT_DEG = 16;

interface EvilFaceProps {
  size: number;
  look: EvilLook;
}

/**
 * Everything drawn over the evil jelly's body: the dark tint, its normal face fading out under
 * glowing red eyes, slammed-down brows and an occasional grin, and the horns on top. Drawn inside
 * the jelly, so it squashes and stretches along with it.
 */
export function EvilFace({ size, look }: EvilFaceProps) {
  const { evil, brows, horns, grin, blink } = look;
  const eyeSize = size * 0.14;
  const browWidth = eyeSize * 1.9;
  const hornWidth = size * 0.2;
  const hornHeight = size * 0.28;

  const tintStyle = useAnimatedStyle(() => ({ opacity: evil.value * TINT_OPACITY }));
  const normalFaceStyle = useAnimatedStyle(() => ({
    opacity: 1 - evil.value,
    transform: [{ scaleY: blink.value }],
  }));
  const eyesStyle = useAnimatedStyle(() => ({ opacity: evil.value }));
  const browsStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, brows.value * 2),
    transform: [{ translateY: (1 - brows.value) * -size * 0.3 }],
  }));
  const grinStyle = useAnimatedStyle(() => ({
    opacity: grin.value * evil.value,
    transform: [{ scaleX: 0.5 + 0.5 * grin.value }, { scaleY: grin.value }],
  }));
  const leftHornStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-HORN_TILT_DEG}deg` }, { scale: horns.value }],
  }));
  const rightHornStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${HORN_TILT_DEG}deg` }, { scale: horns.value }],
  }));

  const eye = (
    <View style={{ width: eyeSize * 2.2, height: eyeSize * 2.2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.glow, { width: eyeSize * 2.2, height: eyeSize * 2.2, borderRadius: eyeSize * 1.1 }]} />
      <View
        style={[
          styles.eye,
          { width: eyeSize * 1.1, height: eyeSize * 1.1, borderRadius: eyeSize * 0.55, shadowRadius: eyeSize },
        ]}
      />
    </View>
  );
  const brow = (tilt: number) => (
    <View
      style={[
        styles.brow,
        {
          width: browWidth,
          height: eyeSize * 0.42,
          borderRadius: eyeSize * 0.2,
          marginHorizontal: eyeSize * 0.05,
          transform: [{ rotate: `${tilt}deg` }],
        },
      ]}
    />
  );
  const horn = (
    <Svg width={hornWidth} height={hornHeight} viewBox="0 0 20 28">
      <Path d="M2 28 C3 16 8 6 16 0 C13 9 15 19 18 28 Z" fill="#B91C1C" stroke={EVIL_DARK} strokeWidth={1.5} />
    </Svg>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: size * 0.38, backgroundColor: EVIL_DARK }, tintStyle]}
      />
      <Animated.View style={[styles.centered, normalFaceStyle]}>
        <JellyFace size={size} direction="down" />
      </Animated.View>
      <Animated.View style={[styles.centered, { top: -size * 0.06 }, eyesStyle]}>
        <View style={styles.row}>
          {eye}
          <View style={{ width: eyeSize * 0.2 }} />
          {eye}
        </View>
      </Animated.View>
      <Animated.View style={[styles.centered, { top: -size * 0.06 - eyeSize * 1.25 }, browsStyle]}>
        <View style={styles.row}>
          {brow(BROW_TILT_DEG)}
          {brow(-BROW_TILT_DEG)}
        </View>
      </Animated.View>
      <Animated.View style={[styles.centered, { top: size * 0.3 }, grinStyle]}>
        <Svg width={size * 0.5} height={size * 0.2} viewBox="0 0 100 40">
          <Path d="M4 4 Q50 52 96 4 Q50 20 4 4 Z" fill={EVIL_DARK} />
          <Path d="M24 11 L30 11 L27 19 Z M70 11 L76 11 L73 19 Z" fill="#FFFFFF" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.horn, { left: size * 0.14, top: -hornHeight * 0.7 }, leftHornStyle]}>
        <View style={{ transform: [{ scaleX: -1 }] }}>{horn}</View>
      </Animated.View>
      <Animated.View style={[styles.horn, { right: size * 0.14, top: -hornHeight * 0.7 }, rightHornStyle]}>
        {horn}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: EVIL_RED,
    opacity: 0.35,
  },
  eye: {
    backgroundColor: EVIL_RED,
    shadowColor: EVIL_RED,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
  },
  brow: {
    backgroundColor: '#0B0310',
  },
  horn: {
    position: 'absolute',
    transformOrigin: 'center bottom',
  },
});
