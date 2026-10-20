import { useContext, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SlideEnabledContext } from '../../board/BoardJelly';
import { isSlide } from '../../board/entityMotion';
import { Jelly, JELLY_MOVE_TRAVEL_MS } from '../../jelly/Jelly';
import { SkinProps } from '../types';
import { ActivationBurst, DustPuff, WindLines } from './SpeedsterEffects';
import { Afterimage, MotionStreaks, SlideValues } from './SpeedTrail';
import { AFTERIMAGE_COUNT, headingBetween, SLIDE_END, slideFraction } from './speedsterMotion';

// The whole slide, trail included, runs at the jelly's normal move pace: the jelly itself arrives
// after JELLY_MOVE_TRAVEL_MS, inside the held-swipe repeat, so two-cell moves chain smoothly.
const SLIDE_TIMING = { duration: JELLY_MOVE_TRAVEL_MS * SLIDE_END, easing: Easing.linear };
// How long the skid to a stop plays before the normal jelly takes over again.
const EXPIRE_MS = 600;
// How much the streamlined jelly stretches along its heading, and how far it leans into it.
const STRETCH = 0.14;
const LEAN_DEG = 10;
// The sprinter's crouch at the start: squash, and lean and shift back.
const CROUCH_SQUASH = 0.18;
const CROUCH_LEAN_DEG = 14;
const CROUCH_SHIFT = 0.1;
// The skid at the end: squash along the heading, lean back and slip a little further.
const SKID_SQUASH = 0.12;
const SKID_LEAN_DEG = 12;
const SKID_SLIP = 0.1;

const AFTERIMAGES = Array.from({ length: AFTERIMAGE_COUNT }, (_, i) => AFTERIMAGE_COUNT - i);

/**
 * Speedster: the jelly crouches like a sprinter and zooms off in a burst of speed lines and
 * lightning, runs stretched and leaning into its heading with wind lines streaming off it, leaves
 * afterimages and streaks behind on every slide, and when it runs out skids to a stop in a puff of
 * dust before relaxing back into its normal shape.
 */
export function SpeedsterSkin({ entity, cellSize, jellyRef, phase, remainingMs, onExitDone }: SkinProps) {
  const {
    color,
    position: { row, col },
  } = entity;
  const slideEnabled = useContext(SlideEnabledContext);
  const size = cellSize * 0.8;
  const inset = (cellSize - size) / 2;

  const fromX = useSharedValue(col * cellSize + inset);
  const fromY = useSharedValue(row * cellSize + inset);
  const toX = useSharedValue(col * cellSize + inset);
  const toY = useSharedValue(row * cellSize + inset);
  const progress = useSharedValue(SLIDE_END);
  // The direction of the last move, one step on each axis. Facing right until it moves.
  const headingX = useSharedValue(1);
  const headingY = useSharedValue(0);
  // 0 for the normal jelly shape, 1 for the streamlined one.
  const streamline = useSharedValue(0);
  const crouch = useSharedValue(0);
  const skid = useSharedValue(0);
  const burst = useSharedValue(0);
  const dust = useSharedValue(0);
  const shown = useRef({ row, col, cellSize });
  const slide: SlideValues = { fromX, fromY, toX, toY, progress };

  useEffect(() => {
    const prev = shown.current;
    shown.current = { row, col, cellSize };
    const targetX = col * cellSize + inset;
    const targetY = row * cellSize + inset;

    // Like the normal jelly, only a move slides; anything else places it instantly.
    if (slideEnabled.current && prev.cellSize === cellSize && isSlide(prev, { row, col })) {
      // Start from wherever the jelly is now, in case the last slide hasn't finished.
      const at = slideFraction(progress.get());
      fromX.set(fromX.get() + (toX.get() - fromX.get()) * at);
      fromY.set(fromY.get() + (toY.get() - fromY.get()) * at);
      toX.set(targetX);
      toY.set(targetY);
      const heading = headingBetween(prev, { row, col });
      headingX.set(heading.x);
      headingY.set(heading.y);
      progress.set(withSequence(withTiming(0, { duration: 0 }), withTiming(SLIDE_END, SLIDE_TIMING)));
    } else {
      fromX.set(targetX);
      fromY.set(targetY);
      toX.set(targetX);
      toY.set(targetY);
      progress.set(SLIDE_END);
    }
  }, [row, col, cellSize, inset, slideEnabled, fromX, fromY, toX, toY, progress, headingX, headingY]);

  useEffect(() => {
    if (phase === 'activating') {
      crouch.set(
        withSequence(
          withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(-0.35, { duration: 90, easing: Easing.in(Easing.quad) }),
          withSpring(0, { damping: 9, stiffness: 180 })
        )
      );
      streamline.set(withDelay(140, withSpring(1, { damping: 12, stiffness: 160 })));
      burst.set(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(120, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }))
        )
      );
      return;
    }
    if (phase === 'active') {
      // Already on its way there if the skin started out activating.
      if (streamline.get() === 0) streamline.set(withSpring(1, { damping: 12, stiffness: 160 }));
      return;
    }

    skid.set(
      withSequence(
        withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
        withDelay(140, withSpring(0, { damping: 7, stiffness: 140 }))
      )
    );
    streamline.set(withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }));
    dust.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) })));
    const timer = setTimeout(onExitDone, EXPIRE_MS);
    return () => clearTimeout(timer);
  }, [phase, onExitDone, crouch, streamline, burst, skid, dust]);

  const leadStyle = useAnimatedStyle(() => {
    const at = slideFraction(progress.value);
    return {
      transform: [
        { translateX: fromX.value + (toX.value - fromX.value) * at },
        { translateY: fromY.value + (toY.value - fromY.value) * at },
      ],
    };
  });

  const bodyStyle = useAnimatedStyle(() => {
    const horizontal = headingX.value !== 0;
    const s = streamline.value;
    const c = crouch.value;
    const k = skid.value;
    const along = 1 + STRETCH * s - SKID_SQUASH * k;
    const across = 1 - STRETCH * 0.6 * s + SKID_SQUASH * 0.5 * k;
    // Top of the jelly towards the heading leans forward; the crouch and skid lean it back.
    const lean = headingX.value * (-LEAN_DEG * s + CROUCH_LEAN_DEG * c + SKID_LEAN_DEG * k);
    const shift = size * (SKID_SLIP * k - CROUCH_SHIFT * c);

    return {
      transform: [
        { translateX: headingX.value * shift },
        { translateY: headingY.value * shift },
        { skewX: `${lean}deg` },
        { scaleX: (horizontal ? along : across) * (1 + CROUCH_SQUASH * 0.6 * c) },
        { scaleY: (horizontal ? across : along) * (1 - CROUCH_SQUASH * c) },
      ],
    };
  });

  return (
    <>
      <MotionStreaks slide={slide} headingX={headingX} size={size} />
      {AFTERIMAGES.map((index) => (
        <Afterimage key={index} slide={slide} index={index} color={color} size={size} />
      ))}
      <Animated.View style={[styles.lead, { width: size, height: size }, leadStyle]}>
        <WindLines
          size={size}
          headingX={headingX}
          headingY={headingY}
          streamline={streamline}
          remainingMs={remainingMs}
        />
        <DustPuff size={size} headingX={headingX} headingY={headingY} dust={dust} />
        <Animated.View style={bodyStyle}>
          <Jelly ref={jellyRef} color={color} size={size} />
        </Animated.View>
        <ActivationBurst size={size} burst={burst} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  lead: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
