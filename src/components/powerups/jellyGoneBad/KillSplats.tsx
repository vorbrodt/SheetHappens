import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { PlayerId } from '../../../game/types';
import { useGameStore } from '../../../state/gameStore';

// Kills come one or two at a time; past that the oldest splat restarts.
const SLOT_COUNT = 3;
const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => i);

const SPLAT_MS = 520;
// Each droplet's direction (radians), how far it flies from the victim's center and its size, both
// in cell sizes.
const DROPLETS = Array.from({ length: 9 }, (_, i) => ({
  angle: (i / 9) * Math.PI * 2 + (i % 2) * 0.3,
  distance: 0.7 + (i % 3) * 0.2,
  size: 0.12 + ((i * 7) % 4) * 0.025,
}));

interface Splat {
  // The victim's center on the board, in px, and how big it was, in cells.
  x: number;
  y: number;
  cells: number;
  color: string;
}

interface SplatHandle {
  play(splat: Splat): void;
}

interface KillSplatsProps {
  killerId: PlayerId;
  cellSize: number;
}

// Whoever `killerId` kills bursts into a splash of its own paint and a ring of droplets.
export function KillSplats({ killerId, cellSize }: KillSplatsProps) {
  const slots = useRef<(SplatHandle | null)[]>([]);
  const nextSlot = useRef(0);

  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.match.events === prev.match.events) return;
        for (const event of state.match.events) {
          if (event.type !== 'killed' || event.by !== killerId) continue;
          const victim = state.match.entities.find((e) => e.id === event.entityId);
          if (!victim) continue;

          const rows = victim.footprint.map((cell) => cell.row);
          const cols = victim.footprint.map((cell) => cell.col);
          const slot = slots.current[nextSlot.current];
          nextSlot.current = (nextSlot.current + 1) % SLOT_COUNT;
          slot?.play({
            x: (victim.position.col + (Math.min(...cols) + Math.max(...cols) + 1) / 2) * cellSize,
            y: (victim.position.row + (Math.min(...rows) + Math.max(...rows) + 1) / 2) * cellSize,
            cells: Math.max(Math.max(...rows) - Math.min(...rows), Math.max(...cols) - Math.min(...cols)) + 1,
            color: victim.color,
          });
          if (state.localPlayerId === killerId || state.localPlayerId === victim.id) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
        }
      }),
    [killerId, cellSize]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SLOTS.map((i) => (
        <SplatSlot
          key={i}
          ref={(handle) => {
            slots.current[i] = handle;
          }}
          cellSize={cellSize}
        />
      ))}
    </View>
  );
}

interface SplatSlotProps {
  cellSize: number;
}

const SplatSlot = forwardRef<SplatHandle, SplatSlotProps>(function SplatSlot({ cellSize }, ref) {
  // 0 → 1 over one splat; a finished (or never played) slot sits at 1 and is hidden.
  const progress = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const color = useSharedValue('#000000');

  useImperativeHandle(
    ref,
    () => ({
      play(splat) {
        x.set(splat.x);
        y.set(splat.y);
        scale.set(splat.cells * cellSize);
        color.set(splat.color);
        progress.set(0);
        progress.set(withTiming(1, { duration: SPLAT_MS, easing: Easing.out(Easing.cubic) }));
      },
    }),
    [cellSize, x, y, scale, color, progress]
  );

  // A blob the victim's size that bursts outwards and fades.
  const blobStyle = useAnimatedStyle(() => {
    const size = scale.value * interpolate(progress.value, [0, 0.25, 1], [0.8, 1.25, 1.4]);
    return {
      opacity: progress.value >= 1 ? 0 : interpolate(progress.value, [0, 0.2, 1], [1, 0.85, 0]),
      backgroundColor: color.value,
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [{ translateX: x.value - size / 2 }, { translateY: y.value - size / 2 }],
    };
  });

  return (
    <>
      <Animated.View style={[styles.piece, blobStyle]} />
      {DROPLETS.map((droplet, i) => (
        <Droplet key={i} {...droplet} progress={progress} x={x} y={y} scale={scale} color={color} />
      ))}
    </>
  );
});

interface DropletProps {
  angle: number;
  distance: number;
  size: number;
  progress: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  // The victim's size in px.
  scale: SharedValue<number>;
  color: SharedValue<string>;
}

function Droplet({ angle, distance, size, progress, x, y, scale, color }: DropletProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const d = size * scale.value * interpolate(progress.value, [0, 1], [1, 0.4]);
    const reach = distance * scale.value * progress.value;
    // A little gravity pulls each droplet down as it flies.
    const fall = progress.value * progress.value * scale.value * 0.35;
    return {
      opacity: progress.value >= 1 ? 0 : interpolate(progress.value, [0, 0.7, 1], [1, 1, 0]),
      backgroundColor: color.value,
      width: d,
      height: d,
      borderRadius: d / 2,
      transform: [
        { translateX: x.value + Math.cos(angle) * reach - d / 2 },
        { translateY: y.value + Math.sin(angle) * reach + fall - d / 2 },
      ],
    };
  });

  return <Animated.View style={[styles.piece, animatedStyle]} />;
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
