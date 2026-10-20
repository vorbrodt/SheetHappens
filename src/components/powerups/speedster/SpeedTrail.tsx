import { StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { afterimageLag, TRAIL_SPREAD, slideFraction, trailVisibility } from './speedsterMotion';

// Where the jelly slides from and to (its top-left corner on the board) and how far along it is.
export interface SlideValues {
  fromX: SharedValue<number>;
  fromY: SharedValue<number>;
  toX: SharedValue<number>;
  toY: SharedValue<number>;
  progress: SharedValue<number>;
}

const AFTERIMAGE_OPACITY = 0.5;
// How much smaller each afterimage further back is.
const AFTERIMAGE_SHRINK = 0.1;
// Where the streaks run across the jelly, in jelly sizes from its middle.
const STREAK_OFFSETS = [-0.28, 0, 0.28];

interface AfterimageProps {
  slide: SlideValues;
  // 1 is the closest to the jelly.
  index: number;
  color: string;
  size: number;
}

// A fading copy of the jelly lagging behind it during a slide.
export function Afterimage({ slide, index, color, size }: AfterimageProps) {
  const style = useAnimatedStyle(() => {
    const { fromX, fromY, toX, toY, progress } = slide;
    const at = slideFraction(progress.value, afterimageLag(index));
    return {
      opacity: (AFTERIMAGE_OPACITY / index) * trailVisibility(progress.value),
      transform: [
        { translateX: fromX.value + (toX.value - fromX.value) * at },
        { translateY: fromY.value + (toY.value - fromY.value) * at },
        { scale: 1 - AFTERIMAGE_SHRINK * index },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        styles.afterimage,
        { width: size, height: size, borderRadius: size * 0.38, backgroundColor: color },
        style,
      ]}
    />
  );
}

interface MotionStreaksProps {
  slide: SlideValues;
  headingX: SharedValue<number>;
  size: number;
}

// Speed lines from the back of the trail up to the jelly during a slide.
export function MotionStreaks(props: MotionStreaksProps) {
  return STREAK_OFFSETS.map((offset) => <Streak key={offset} offset={offset} {...props} />);
}

function Streak({ slide, headingX, size, offset }: MotionStreaksProps & { offset: number }) {
  const style = useAnimatedStyle(() => {
    const { fromX, fromY, toX, toY, progress } = slide;
    const lead = slideFraction(progress.value);
    const tail = slideFraction(progress.value, TRAIL_SPREAD);
    const leadX = fromX.value + (toX.value - fromX.value) * lead + size / 2;
    const leadY = fromY.value + (toY.value - fromY.value) * lead + size / 2;
    const tailX = fromX.value + (toX.value - fromX.value) * tail + size / 2;
    const tailY = fromY.value + (toY.value - fromY.value) * tail + size / 2;
    const horizontal = headingX.value !== 0;
    const thickness = Math.max(2, size * 0.06);
    const length = horizontal ? Math.abs(leadX - tailX) : Math.abs(leadY - tailY);

    return {
      opacity: 0.8 * trailVisibility(progress.value),
      width: horizontal ? length : thickness,
      height: horizontal ? thickness : length,
      borderRadius: thickness / 2,
      transform: [
        { translateX: horizontal ? Math.min(leadX, tailX) : leadX + offset * size - thickness / 2 },
        { translateY: horizontal ? leadY + offset * size - thickness / 2 : Math.min(leadY, tailY) },
      ],
    };
  });

  return <Animated.View style={[styles.piece, styles.streak, style]} />;
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  afterimage: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  streak: {
    backgroundColor: '#FFFFFF',
  },
});
