import { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useGameStore } from '../../../state/gameStore';
import { SlideEnabledContext } from '../../board/BoardJelly';
import { isSlide } from '../../board/entityMotion';
import { useMatchClock } from '../../match/useMatchClock';
import { SkinProps } from '../types';
import { GhostBody, seedFor } from './GhostBody';

// How long a ghost takes to rise out of its owner and drift to the cell it was summoned on.
export const GHOST_RISE_MS = 450;
// Ghosts glide between cells more lazily than jellies hop, but still within their 400ms move pace.
const DRIFT_TIMING = { duration: 320, easing: Easing.inOut(Easing.sin) };
const BOB_PERIOD_MS = 1_600;
// How far a ghost bobs up and down, and how high its rise arcs, in cell sizes.
const BOB_HEIGHT = 0.06;
const RISE_HEIGHT = 0.7;
// It starts flickering this long before the army leaves.
const FLICKER_MS = 900;
const FLICKER_STEP_MS = 70;

/**
 * A ghost summoned by Ghost Army: a translucent ghost of its owner's jelly that rises out of the
 * owner with a whoosh when summoned, then floats over its cell, bobbing and swaying, gliding along
 * as it wanders, and flickers as the army's time runs out. The owner's skin plays its departure.
 * Animations follow the match clock, so they hold still while paused.
 */
export function GhostSkin({ entity, cellSize, phase, remainingMs, onExitDone }: SkinProps) {
  const { id, color, position: { row, col } } = entity;
  const clock = useMatchClock();
  const slideEnabled = useContext(SlideEnabledContext);
  const size = cellSize * 0.8;
  const inset = (cellSize - size) / 2;
  const seed = seedFor(id);
  const [startedAt] = useState(() => entity.activePowerUp?.startedAt ?? -Infinity);
  // Where the owner stood when it summoned this ghost.
  const [origin] = useState(() => {
    const owner = useGameStore.getState().match.entities.find((e) => e.id === entity.summonedBy);
    return owner?.position ?? entity.position;
  });

  const x = useSharedValue(col * cellSize + inset);
  const y = useSharedValue(row * cellSize + inset);
  const shown = useRef({ row, col, cellSize });

  useEffect(() => {
    const prev = shown.current;
    shown.current = { row, col, cellSize };
    const targetX = col * cellSize + inset;
    const targetY = row * cellSize + inset;
    if (slideEnabled.current && prev.cellSize === cellSize && isSlide(prev, { row, col })) {
      x.set(withTiming(targetX, DRIFT_TIMING));
      y.set(withTiming(targetY, DRIFT_TIMING));
    } else {
      x.set(targetX);
      y.set(targetY);
    }
  }, [row, col, cellSize, inset, slideEnabled, x, y]);

  // The engine removes ghosts as their army runs out, so this only comes up if one outlives it.
  useEffect(() => {
    if (phase === 'expiring') onExitDone();
  }, [phase, onExitDone]);

  const originX = origin.col * cellSize + inset;
  const originY = origin.row * cellSize + inset;

  const ghostStyle = useAnimatedStyle(() => {
    const now = clock.value;
    const rise = Math.min(1, Math.max(0, (now - startedAt) / GHOST_RISE_MS));
    const eased = 1 - Math.pow(1 - rise, 3);
    const arc = Math.sin(Math.PI * rise) * cellSize * RISE_HEIGHT;
    const wave = (now / BOB_PERIOD_MS) * Math.PI * 2 + seed;
    const left = remainingMs.value;
    const flickeredOff = left > 0 && left < FLICKER_MS && Math.floor(left / FLICKER_STEP_MS) % 3 === 0;
    return {
      opacity: interpolate(rise, [0, 0.35, 1], [0, 0.85, 1]) * (flickeredOff ? 0.3 : 1),
      transform: [
        { translateX: originX + (x.value - originX) * eased },
        { translateY: originY + (y.value - originY) * eased - arc + Math.sin(wave) * cellSize * BOB_HEIGHT },
        { scale: 0.3 + 0.7 * eased },
        { rotate: `${Math.sin(wave * 0.5) * 4}deg` },
      ],
    };
  });

  // The streak it leaves as it whooshes up and out.
  const trailStyle = useAnimatedStyle(() => {
    const rise = Math.min(1, Math.max(0, (clock.value - startedAt) / GHOST_RISE_MS));
    return { opacity: Math.sin(Math.PI * rise) * 0.45, transform: [{ scaleY: 1 + 1.6 * (1 - rise) }] };
  });

  return (
    <Animated.View style={[styles.entity, ghostStyle]}>
      <Animated.View
        style={[
          styles.trail,
          {
            backgroundColor: color,
            width: size * 0.4,
            height: size * 0.7,
            borderRadius: size * 0.2,
            left: size * 0.3,
            top: size * 0.45,
          },
          trailStyle,
        ]}
      />
      <GhostBody color={color} size={size} clock={clock} seed={seed} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entity: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  trail: {
    position: 'absolute',
    // Stretches down, back towards where it came from.
    transformOrigin: 'top',
  },
});
