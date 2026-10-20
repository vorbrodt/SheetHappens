import { useContext, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SlideEnabledContext } from '../../board/BoardJelly';
import { isSlide } from '../../board/entityMotion';
import { Jelly, JELLY_MOVE_TRAVEL_MS } from '../../jelly/Jelly';
import { JellyHandle } from '../../jelly/types';
import { SkinPhase, SkinProps } from '../types';
import { Puff, Puffs } from './Puffs';
import { Spikes } from './Spikes';

const SLIDE_TIMING = { duration: JELLY_MOVE_TRAVEL_MS, easing: Easing.inOut(Easing.quad) };

// The giant fills this share of its 2x2 block; the normal jelly fills 0.8 of its cell (BoardJelly).
const GIANT_FILL = 0.86;
const NORMAL_FILL = 0.8;

// When the activation's stomp lands, and how long the expiry takes before handing back.
const STOMP_AT_MS = 400;
const EXPIRE_MS = 650;

// The heavy idle: a slow squash and stretch, deeper than the normal jelly's.
const HEAVY_WOBBLE = 0.035;
const HEAVY_WOBBLE_MS = 650;

// Dust kicked out from under both feet, in cell sizes from the block's top-left corner.
const STOMP_DUST: Puff[] = [
  { x: 0.4, y: 1.9, dx: -0.7, dy: -0.15, size: 0.34 },
  { x: 0.3, y: 1.8, dx: -0.45, dy: -0.55, size: 0.26 },
  { x: 0.7, y: 1.95, dx: -0.25, dy: 0.15, size: 0.22 },
  { x: 1.6, y: 1.9, dx: 0.7, dy: -0.15, size: 0.34 },
  { x: 1.7, y: 1.8, dx: 0.45, dy: -0.55, size: 0.26 },
  { x: 1.3, y: 1.95, dx: 0.25, dy: 0.15, size: 0.22 },
];

// A ring of puffs around the top-left cell's center as the giant deflates onto it.
const POOF: Puff[] = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return { x: 0.5, y: 0.5, dx: Math.cos(angle) * 0.55, dy: Math.sin(angle) * 0.55, size: 0.24 };
});

/**
 * Jellysaurus: the jelly as a 2x2 giant with dino spikes. Switching on, it swells over its block,
 * pops its spikes and stomps down, shaking and kicking up dust. While it runs, it slides as one
 * block with a heavy wobble and thumps on landing each move. Running out, the spikes retract and it
 * deflates with a poof back onto its top-left cell, where the normal jelly takes over.
 */
export function JellysaurusSkin({ entity, cellSize, jellyRef, phase, onExitDone }: SkinProps) {
  const { row, col } = entity.position;
  const slideEnabled = useContext(SlideEnabledContext);
  const giantSize = cellSize * 2 * GIANT_FILL;
  const normalScale = (cellSize * NORMAL_FILL) / giantSize;
  const startsGrown = phase !== 'activating';

  const x = useSharedValue(col * cellSize);
  const y = useSharedValue(row * cellSize);
  const shown = useRef({ row, col, cellSize });
  // 0 is the normal jelly on the top-left cell, 1 the giant over the whole block.
  const grow = useSharedValue(startsGrown ? 1 : 0);
  const spikes = useSharedValue(startsGrown ? 1 : 0);
  // How far the stomp lifts it, in px.
  const lift = useSharedValue(0);
  // 0 to 1: how flat a landing squashes it.
  const squash = useSharedValue(0);
  const shake = useSharedValue(0);
  const wobble = useSharedValue(-1);
  // Each burst runs 0 → 1 and rests on 1.
  const stomp = useSharedValue(1);
  const poof = useSharedValue(1);
  const jelly = useRef<JellyHandle>(null);

  useEffect(() => {
    const prev = shown.current;
    shown.current = { row, col, cellSize };
    const targetX = col * cellSize;
    const targetY = row * cellSize;
    if (slideEnabled.current && prev.cellSize === cellSize && isSlide(prev, { row, col })) {
      x.set(withTiming(targetX, SLIDE_TIMING));
      y.set(withTiming(targetY, SLIDE_TIMING));
    } else {
      x.set(targetX);
      y.set(targetY);
    }
  }, [row, col, cellSize, slideEnabled, x, y]);

  useEffect(() => {
    wobble.set(withRepeat(withTiming(1, { duration: HEAVY_WOBBLE_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(wobble);
  }, [wobble]);

  // Moves and paints play on the giant's jelly as usual, and every move lands with a thump.
  useImperativeHandle(
    jellyRef,
    () => ({
      playMove(direction) {
        jelly.current?.playMove(direction);
        squash.set(
          withDelay(
            JELLY_MOVE_TRAVEL_MS,
            withSequence(withTiming(0.5, { duration: 60 }), withSpring(0, { damping: 7, stiffness: 200 }))
          )
        );
      },
      playPaint() {
        jelly.current?.playPaint();
      },
    }),
    [squash]
  );

  // Plays each phase's animation once as the skin enters it. Mounting straight into 'active' (say,
  // with the game screen) has nothing to play.
  const played = useRef<SkinPhase | null>(phase === 'active' ? phase : null);
  useEffect(() => {
    if (played.current === phase) return;
    played.current = phase;

    if (phase === 'activating') {
      grow.set(
        withSequence(
          withTiming(1.12, { duration: 220, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 140, easing: Easing.inOut(Easing.quad) })
        )
      );
      spikes.set(withDelay(140, withTiming(1, { duration: 320 })));
      lift.set(
        withSequence(
          withDelay(160, withTiming(cellSize * 0.35, { duration: 150, easing: Easing.out(Easing.quad) })),
          withTiming(0, { duration: STOMP_AT_MS - 310, easing: Easing.in(Easing.quad) })
        )
      );
      squash.set(
        withDelay(
          STOMP_AT_MS,
          withSequence(withTiming(1, { duration: 50 }), withSpring(0, { damping: 6, stiffness: 200 }))
        )
      );
      shake.set(
        withDelay(
          STOMP_AT_MS,
          withSequence(
            withTiming(1, { duration: 40 }),
            withTiming(-0.8, { duration: 40 }),
            withTiming(0.5, { duration: 40 }),
            withTiming(-0.3, { duration: 40 }),
            withTiming(0, { duration: 40 })
          )
        )
      );
      stomp.set(0);
      stomp.set(withDelay(STOMP_AT_MS, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })));
      return;
    }

    if (phase === 'expiring') {
      spikes.set(withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }));
      grow.set(
        withSequence(
          withTiming(1.06, { duration: 120, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) })
        )
      );
      poof.set(0);
      poof.set(withDelay(300, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) })));
      const timer = setTimeout(onExitDone, EXPIRE_MS);
      return () => clearTimeout(timer);
    }
  }, [phase, cellSize, onExitDone, grow, spikes, lift, squash, shake, stomp, poof]);

  const blockStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value + shake.value * cellSize * 0.08 }, { translateY: y.value }],
  }));

  const bodyStyle = useAnimatedStyle(() => {
    // Its center goes from the top-left cell's to the block's; the swell's overshoot only scales.
    const center = interpolate(grow.value, [0, 1], [cellSize / 2, cellSize], Extrapolation.CLAMP);
    const scale = interpolate(grow.value, [0, 1], [normalScale, 1]);
    const w = wobble.value * HEAVY_WOBBLE;
    const scaleX = scale * (1 + w) * (1 + 0.18 * squash.value);
    const scaleY = scale * (1 - w) * (1 - 0.22 * squash.value);
    // Squashing keeps its feet on the ground.
    const sink = (giantSize * (scale - scaleY)) / 2;
    return {
      transform: [
        { translateX: center - giantSize / 2 },
        { translateY: center - giantSize / 2 - lift.value + sink },
        { scaleX },
        { scaleY },
      ],
    };
  });

  // A shockwave rolling out from under the stomp across the board.
  const shockwaveStyle = useAnimatedStyle(() => {
    const t = stomp.value;
    return {
      opacity: t > 0 && t < 1 ? interpolate(t, [0, 1], [0.45, 0]) : 0,
      transform: [{ scale: interpolate(t, [0, 1], [0.6, 2.6]) }],
    };
  });

  return (
    <Animated.View style={[styles.block, { width: cellSize * 2, height: cellSize * 2 }, blockStyle]}>
      <Animated.View
        style={[
          styles.shockwave,
          { width: cellSize * 2, height: cellSize * 2, borderRadius: cellSize, borderColor: entity.color },
          shockwaveStyle,
        ]}
      />
      <Animated.View style={[styles.body, { width: giantSize, height: giantSize }, bodyStyle]}>
        <Spikes color={entity.color} size={giantSize} progress={spikes} />
        <Jelly ref={jelly} color={entity.color} size={giantSize} />
      </Animated.View>
      <Puffs puffs={STOMP_DUST} cellSize={cellSize} progress={stomp} />
      <Puffs puffs={POOF} cellSize={cellSize} progress={poof} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  body: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  shockwave: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 3,
  },
});
