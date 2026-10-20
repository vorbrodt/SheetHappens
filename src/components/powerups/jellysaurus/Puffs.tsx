import { StyleSheet } from 'react-native';
import Animated, { interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';

const PUFF_COLOR = '#E7E2DA';
const PUFF_OUTLINE = 'rgba(31, 41, 51, 0.25)';

// One puff: where it starts and how far it drifts, both in cell sizes from the puffs' origin, and
// its size in cell sizes.
export interface Puff {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
}

interface PuffsProps {
  puffs: Puff[];
  cellSize: number;
  // One burst runs 0 → 1. Outside that (including at rest on 1) nothing shows.
  progress: SharedValue<number>;
}

// A burst of little clouds drifting out and fading: dust kicked up by a stomp, or a poof.
export function Puffs({ puffs, cellSize, progress }: PuffsProps) {
  return (
    <>
      {puffs.map((puff, index) => (
        <PuffView key={index} {...puff} cellSize={cellSize} progress={progress} />
      ))}
    </>
  );
}

function PuffView({ x, y, dx, dy, size, cellSize, progress }: Puff & { cellSize: number; progress: SharedValue<number> }) {
  const diameter = size * cellSize;

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const showing = t > 0 && t < 1;
    return {
      opacity: showing ? interpolate(t, [0, 0.15, 1], [0, 0.95, 0]) : 0,
      transform: [
        { translateX: (x + dx * t) * cellSize - diameter / 2 },
        { translateY: (y + dy * t) * cellSize - diameter / 2 },
        { scale: interpolate(t, [0, 1], [0.4, 1.3]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.puff, { width: diameter, height: diameter, borderRadius: diameter / 2 }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  puff: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: PUFF_COLOR,
    borderWidth: 1,
    borderColor: PUFF_OUTLINE,
  },
});
