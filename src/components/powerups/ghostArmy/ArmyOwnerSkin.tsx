import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ghostsOf } from '../../../game/powerups/ghostArmy';
import { PlayerId, Position } from '../../../game/types';
import { useGameStore } from '../../../state/gameStore';
import { BoardJelly } from '../../board/BoardJelly';
import { useMatchClock } from '../../match/useMatchClock';
import { SkinProps } from '../types';
import { GhostBody, seedFor } from './GhostBody';

// The puff of air the ghosts burst out of the owner with.
const WHOOSH_MS = 500;
// How long a ghost takes to flicker and fade away upwards when the army leaves.
const DEPART_MS = 900;
// Of DEPART_MS, the part spent flickering before it fades.
const FLICKER_END = 0.35;
const WISPS = [-0.22, 0.02, 0.24];

interface Departure {
  // When the ghosts left the board, on the match clock.
  leftAt: number;
  ghosts: { id: PlayerId; position: Position }[];
}

/**
 * The owner of a Ghost Army: its normal jelly, which bursts with a whoosh of air as its ghosts
 * rise out of it. When the army runs out the engine takes the ghosts off the board, so this plays
 * their departure in their place — each one flickers and fades upward into wisps where it last
 * stood — before handing the owner back to its normal look.
 */
export function ArmyOwnerSkin({ entity, cellSize, jellyRef, phase, onExitDone }: SkinProps) {
  const clock = useMatchClock();
  const [whoosh] = useState(() => ({ at: entity.activePowerUp?.startedAt ?? -Infinity, position: entity.position }));
  const [departure, setDeparture] = useState<Departure | null>(null);
  const ownerId = entity.id;

  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        const before = ghostsOf(prev.match, ownerId);
        if (before.length === 0 || ghostsOf(state.match, ownerId).length > 0) return;
        setDeparture({
          leftAt: state.match.elapsedMs,
          ghosts: before.map(({ id, position }) => ({ id, position })),
        });
      }),
    [ownerId]
  );

  const leftAt = departure?.leftAt ?? null;
  useAnimatedReaction(
    () => leftAt !== null && clock.value - leftAt >= DEPART_MS,
    (done, wasDone) => {
      if (done && !wasDone) scheduleOnRN(setDeparture, null);
    },
    [leftAt]
  );

  useEffect(() => {
    if (phase === 'expiring' && !departure) onExitDone();
  }, [phase, departure, onExitDone]);

  const whooshStyle = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (clock.value - whoosh.at) / WHOOSH_MS));
    return { opacity: t >= 1 ? 0 : 0.5 * (1 - t), transform: [{ scale: 0.6 + 1.2 * t }] };
  });

  return (
    <>
      <Animated.View
        style={[
          styles.whoosh,
          {
            width: cellSize,
            height: cellSize,
            borderRadius: cellSize / 2,
            borderWidth: cellSize * 0.08,
            borderColor: entity.color,
            left: whoosh.position.col * cellSize,
            top: whoosh.position.row * cellSize,
          },
          whooshStyle,
        ]}
      />
      <BoardJelly jellyRef={jellyRef} color={entity.color} position={entity.position} cellSize={cellSize} />
      {departure?.ghosts.map((ghost) => (
        <DepartingGhost
          key={ghost.id}
          id={ghost.id}
          color={entity.color}
          position={ghost.position}
          cellSize={cellSize}
          clock={clock}
          leftAt={departure.leftAt}
        />
      ))}
    </>
  );
}

interface DepartingGhostProps {
  id: PlayerId;
  color: string;
  position: Position;
  cellSize: number;
  clock: SharedValue<number>;
  leftAt: number;
}

// One ghost leaving: it flickers, then stretches and fades upward while wisps curl off it.
function DepartingGhost({ id, color, position, cellSize, clock, leftAt }: DepartingGhostProps) {
  const size = cellSize * 0.8;
  const inset = (cellSize - size) / 2;
  const seed = seedFor(id);

  const ghostStyle = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (clock.value - leftAt) / DEPART_MS));
    const fade = Math.max(0, (t - FLICKER_END) / (1 - FLICKER_END));
    const flickeredOff = t < FLICKER_END && Math.floor(t * 18) % 2 === 1;
    return {
      opacity: (flickeredOff ? 0.25 : 1) * (1 - fade),
      transform: [
        { translateY: -cellSize * 0.8 * fade * fade },
        { scaleX: 1 - 0.45 * fade },
        { scaleY: 1 + 0.35 * fade },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.cell, { width: cellSize, height: cellSize, left: position.col * cellSize, top: position.row * cellSize }]}
    >
      <Animated.View style={[{ position: 'absolute', left: inset, top: inset }, ghostStyle]}>
        <GhostBody color={color} size={size} clock={clock} seed={seed} />
      </Animated.View>
      {WISPS.map((offset, i) => (
        <Wisp key={offset} color={color} cellSize={cellSize} offset={offset} delay={i * 0.12} clock={clock} leftAt={leftAt} />
      ))}
    </Animated.View>
  );
}

interface WispProps {
  color: string;
  cellSize: number;
  // Across the cell from its centre, in cell sizes.
  offset: number;
  // Of DEPART_MS, how long after the flicker it curls off.
  delay: number;
  clock: SharedValue<number>;
  leftAt: number;
}

// A puff of ghost curling up and away.
function Wisp({ color, cellSize, offset, delay, clock, leftAt }: WispProps) {
  const size = cellSize * 0.18;

  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (clock.value - leftAt) / DEPART_MS));
    const start = FLICKER_END + delay;
    const p = Math.min(1, Math.max(0, (t - start) / (1 - start)));
    return {
      opacity: p === 0 || p === 1 ? 0 : 0.5 * Math.sin(Math.PI * p),
      transform: [
        { translateX: Math.sin(p * Math.PI * 2 + offset * 10) * cellSize * 0.1 },
        { translateY: -cellSize * (0.2 + 1.1 * p) },
        { scale: 1 - 0.5 * p },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.wisp,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          left: cellSize * (0.5 + offset) - size / 2,
          top: cellSize * 0.5 - size / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  whoosh: {
    position: 'absolute',
  },
  cell: {
    position: 'absolute',
  },
  wisp: {
    position: 'absolute',
  },
});
