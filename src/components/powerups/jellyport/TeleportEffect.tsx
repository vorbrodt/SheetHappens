import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, SharedValue, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { PortalSwirl, Sparkle } from './portalParts';

// Sparkles strung along the way from one swirl to the other.
const TRAIL_COUNT = 5;
const TRAIL = Array.from({ length: TRAIL_COUNT }, (_, i) => (i + 1) / (TRAIL_COUNT + 1));

// Where in a teleport (0 → 1) the jelly has vanished at the origin and starts popping out of the
// target. The skin shrinks and grows it on the same split.
export const TELEPORT_SPLIT = 0.4;

interface TeleportEffectProps {
  cellSize: number;
  // Top-left corners of the origin and target cells, in board coordinates.
  fromX: SharedValue<number>;
  fromY: SharedValue<number>;
  toX: SharedValue<number>;
  toY: SharedValue<number>;
  // 0 → 1 over one teleport; nothing shows at either end.
  progress: SharedValue<number>;
}

// A swirl opening where the jelly vanishes, a matching one where it reappears, and a trail of
// sparkles between them.
export function TeleportEffect({ cellSize, fromX, fromY, toX, toY, progress }: TeleportEffectProps) {
  const spin = useDerivedValue(() => progress.value * Math.PI * 3);
  const originAmount = useDerivedValue(() =>
    interpolate(progress.value, [0, 0.15, TELEPORT_SPLIT, 0.7], [0, 1, 1, 0], 'clamp')
  );
  const targetAmount = useDerivedValue(() =>
    interpolate(progress.value, [0.2, TELEPORT_SPLIT, 0.75, 1], [0, 1, 1, 0], 'clamp')
  );

  const originStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fromX.value }, { translateY: fromY.value }],
  }));
  const targetStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: toX.value }, { translateY: toY.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.cell, originStyle]}>
        <PortalSwirl size={cellSize} amount={originAmount} spin={spin} />
      </Animated.View>
      <Animated.View style={[styles.cell, targetStyle]}>
        <PortalSwirl size={cellSize} amount={targetAmount} spin={spin} />
      </Animated.View>
      {TRAIL.map((at) => (
        <TrailSparkle key={at} at={at} cellSize={cellSize} {...{ fromX, fromY, toX, toY, progress }} />
      ))}
    </View>
  );
}

interface TrailSparkleProps extends Omit<TeleportEffectProps, 'cellSize'> {
  // How far along the way from origin to target it sits, 0 → 1.
  at: number;
  cellSize: number;
}

function TrailSparkle({ at, cellSize, fromX, fromY, toX, toY, progress }: TrailSparkleProps) {
  const size = cellSize * 0.28;
  // Each sparkle lights up a little after the one before it, as the jelly passes by.
  const peak = 0.2 + 0.45 * at;

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const offset = (cellSize - size) / 2;
    return {
      opacity: p <= 0 || p >= 1 ? 0 : interpolate(p, [peak - 0.15, peak, peak + 0.3], [0, 1, 0], 'clamp'),
      transform: [
        { translateX: fromX.value + (toX.value - fromX.value) * at + offset },
        // A slight arc, so the trail doesn't look ruled on.
        { translateY: fromY.value + (toY.value - fromY.value) * at + offset - Math.sin(at * Math.PI) * cellSize * 0.25 },
        { rotate: `${p * Math.PI * 2}rad` },
        { scale: interpolate(p, [peak - 0.15, peak, peak + 0.3], [0.4, 1, 0.5], 'clamp') },
      ],
    };
  });

  return (
    <Animated.View style={[styles.cell, animatedStyle]}>
      <Sparkle size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
