import { useContext, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { samePosition } from '../../../game/rules';
import { Position } from '../../../game/types';
import { useGameStore } from '../../../state/gameStore';
import { SlideEnabledContext } from '../../board/BoardJelly';
import { isSlide } from '../../board/entityMotion';
import { Jelly, JELLY_MOVE_TRAVEL_MS } from '../../jelly/Jelly';
import { SkinProps } from '../types';
import { PORTAL_LIGHT, PortalSwirl, SparkleBurst } from './portalParts';
import { TELEPORT_SPLIT, TeleportEffect } from './TeleportEffect';

const SLIDE_TIMING = { duration: JELLY_MOVE_TRAVEL_MS, easing: Easing.inOut(Easing.quad) };

const ACTIVATE_MS = 700;
// Kept under the engine's 500 ms teleport cooldown, so one teleport is over before the next.
const TELEPORT_MS = 460;
const SHRINK_MS = TELEPORT_MS * TELEPORT_SPLIT;
const GROW_MS = TELEPORT_MS - SHRINK_MS;
const FIZZLE_MS = 420;
const POP_MS = 380;
// The shimmer blinks for this long before the power-up runs out.
const WARNING_MS = 1_500;

/**
 * Jellyport: portal rings swirl open around the jelly when it starts, and it shimmers while it
 * runs. Each teleport spins it down into a swirl where it stands and pops it out of a matching one
 * where it lands, with a trail of sparkles between. When it runs out the shimmer fizzles and a
 * last few sparkles pop.
 */
export function JellyportSkin({ entity, cellSize, jellyRef, phase, remainingMs, onExitDone }: SkinProps) {
  const { row, col } = entity.position;
  const slideEnabled = useContext(SlideEnabledContext);
  const jellySize = cellSize * 0.8;

  // The cell the jelly is drawn on (top-left corner, in board coordinates).
  const x = useSharedValue(col * cellSize);
  const y = useSharedValue(row * cellSize);
  const shown = useRef({ row, col, cellSize });
  // Where the last teleport landed, so the move to it is left to the teleport animation.
  const teleportedTo = useRef<Position | null>(null);

  // Each runs 0 → 1 once per play and sits at 0 until then.
  const activation = useSharedValue(0);
  const teleport = useSharedValue(0);
  const pop = useSharedValue(0);
  // How strongly the jelly shimmers, and the looping pulse and glint sweep of the shimmer.
  const aura = useSharedValue(0);
  const pulse = useSharedValue(0);
  const glint = useSharedValue(0);
  // The jelly's own shrink and spin while it teleports.
  const warpScale = useSharedValue(1);
  const warpSpin = useSharedValue(0);
  const fromX = useSharedValue(0);
  const fromY = useSharedValue(0);
  const toX = useSharedValue(0);
  const toY = useSharedValue(0);

  useEffect(() => {
    const prev = shown.current;
    shown.current = { row, col, cellSize };
    const landed = teleportedTo.current;
    teleportedTo.current = null;
    if (landed && samePosition(landed, { row, col }) && prev.cellSize === cellSize) return;

    if (slideEnabled.current && prev.cellSize === cellSize && isSlide(prev, { row, col })) {
      x.set(withTiming(col * cellSize, SLIDE_TIMING));
      y.set(withTiming(row * cellSize, SLIDE_TIMING));
    } else {
      x.set(col * cellSize);
      y.set(row * cellSize);
    }
  }, [row, col, cellSize, slideEnabled, x, y]);

  // Teleports come from the engine's events: the store reports them before the new position
  // renders, so the jelly can still vanish where it stood.
  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.match.events === prev.match.events) return;
        for (const event of state.match.events) {
          if (event.type !== 'teleported' || event.entityId !== entity.id) continue;
          const { from, to } = event;
          teleportedTo.current = to;
          fromX.set(from.col * cellSize);
          fromY.set(from.row * cellSize);
          toX.set(to.col * cellSize);
          toY.set(to.row * cellSize);
          // The jelly stays on the origin cell until it has vanished, then jumps to the target.
          x.set(withDelay(SHRINK_MS, withTiming(to.col * cellSize, { duration: 0 })));
          y.set(withDelay(SHRINK_MS, withTiming(to.row * cellSize, { duration: 0 })));
          warpScale.set(
            withSequence(
              withTiming(0, { duration: SHRINK_MS, easing: Easing.in(Easing.quad) }),
              withTiming(1.15, { duration: GROW_MS * 0.6, easing: Easing.out(Easing.back(2)) }),
              withTiming(1, { duration: GROW_MS * 0.4 })
            )
          );
          warpSpin.set(
            withSequence(
              withTiming(0, { duration: 0 }),
              withTiming(Math.PI * 2, { duration: SHRINK_MS, easing: Easing.in(Easing.quad) }),
              withTiming(Math.PI * 4, { duration: GROW_MS, easing: Easing.out(Easing.quad) })
            )
          );
          teleport.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: TELEPORT_MS })));
        }
      }),
    [entity.id, cellSize, x, y, fromX, fromY, toX, toY, warpScale, warpSpin, teleport]
  );

  // Swirls open once, as the power-up starts.
  const activating = phase === 'activating';
  useEffect(() => {
    if (!activating) return;
    activation.set(withTiming(1, { duration: ACTIVATE_MS, easing: Easing.out(Easing.cubic) }));
  }, [activating, activation]);

  const expiring = phase === 'expiring';
  useEffect(() => {
    if (expiring) {
      cancelAnimation(pulse);
      cancelAnimation(glint);
      // A few last flickers before it goes out, then one sparkle pop.
      aura.set(
        withSequence(
          withTiming(0.3, { duration: FIZZLE_MS * 0.2 }),
          withTiming(0.8, { duration: FIZZLE_MS * 0.15 }),
          withTiming(0.15, { duration: FIZZLE_MS * 0.2 }),
          withTiming(0.5, { duration: FIZZLE_MS * 0.15 }),
          withTiming(0, { duration: FIZZLE_MS * 0.3 })
        )
      );
      pop.set(withDelay(FIZZLE_MS * 0.6, withTiming(1, { duration: POP_MS, easing: Easing.out(Easing.quad) })));
      const timer = setTimeout(onExitDone, FIZZLE_MS * 0.6 + POP_MS);
      return () => clearTimeout(timer);
    }

    aura.set(withTiming(1, { duration: 300 }));
    pulse.set(withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true));
    glint.set(withRepeat(withDelay(500, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) })), -1));
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(glint);
    };
  }, [expiring, onExitDone, aura, pulse, glint, pop]);

  const ringSpin = useDerivedValue(() => activation.value * Math.PI * 2.5);
  const ringAmount = useDerivedValue(() =>
    activation.value <= 0 || activation.value >= 1
      ? 0
      : interpolate(activation.value, [0, 0.25, 0.7, 1], [0, 1, 1, 0])
  );
  // Blinking as a warning once the end is near.
  const shimmer = useDerivedValue(() => {
    const left = remainingMs.value;
    const blink = left > 0 && left < WARNING_MS ? 0.55 + 0.45 * Math.cos(left / 70) : 1;
    return aura.value * blink;
  });

  const cellStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * (0.3 + 0.25 * pulse.value),
    transform: [{ scale: 1 + 0.08 * pulse.value }],
  }));
  const warpStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${warpSpin.value}rad` }, { scale: warpScale.value }],
  }));
  const glintStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.55,
    transform: [{ translateX: interpolate(glint.value, [0, 1], [-jellySize, jellySize]) }, { rotate: '20deg' }],
  }));

  const glowSize = cellSize * 0.98;
  const jellyInset = (cellSize - jellySize) / 2;
  // How far the opening rings reach past the cell on each side.
  const ringOverhang = cellSize * 0.25;

  return (
    <>
      <TeleportEffect cellSize={cellSize} fromX={fromX} fromY={fromY} toX={toX} toY={toY} progress={teleport} />
      <Animated.View style={[styles.cell, { width: cellSize, height: cellSize }, cellStyle]}>
        <Animated.View
          style={[
            styles.piece,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              left: (cellSize - glowSize) / 2,
              top: (cellSize - glowSize) / 2,
            },
            styles.glow,
            glowStyle,
          ]}
        />
        <View style={[styles.piece, { left: -ringOverhang, top: -ringOverhang }]} pointerEvents="none">
          <PortalSwirl size={cellSize + ringOverhang * 2} amount={ringAmount} spin={ringSpin} />
        </View>
        <Animated.View style={[styles.piece, { left: jellyInset, top: jellyInset }, warpStyle]}>
          <Jelly ref={jellyRef} color={entity.color} size={jellySize} />
          <View
            style={[styles.glintClip, { width: jellySize, height: jellySize, borderRadius: jellySize * 0.38 }]}
            pointerEvents="none"
          >
            <Animated.View style={[styles.glint, { width: jellySize * 0.18, height: jellySize * 1.6 }, glintStyle]} />
          </View>
        </Animated.View>
        <SparkleBurst
          size={cellSize}
          count={6}
          reach={cellSize * 0.75}
          sparkleSize={cellSize * 0.3}
          progress={activation}
        />
        <SparkleBurst
          size={cellSize}
          count={5}
          reach={cellSize * 0.6}
          sparkleSize={cellSize * 0.26}
          progress={pop}
          angleOffset={Math.PI / 5}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  piece: {
    position: 'absolute',
  },
  glow: {
    backgroundColor: PORTAL_LIGHT,
  },
  glintClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glint: {
    backgroundColor: '#fff',
    borderRadius: 999,
  },
});
