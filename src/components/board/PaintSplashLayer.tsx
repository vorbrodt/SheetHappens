import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Position } from '../../game/types';
import { PaintSplash } from '../match/paintSplashes';
import { usePaintSplashes } from '../match/usePaintSplashes';
import { useBoardLayout } from './useBoardLayout';

// Splashes reuse a fixed set of views, so painting never mounts anything. Five bots painting every
// 200 ms plus the player keep about ten in flight; past that the oldest (nearly faded) restarts.
const SLOT_COUNT = 16;
const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => i);

const SPLASH_TIMING = { duration: 320, easing: Easing.out(Easing.cubic) };
const BLOB_SIZE = 0.9;
const BLOB_WOBBLE = 0.14;

// Each droplet's direction (radians, turned by the splash's random spin), how far it flies from
// the cell's center, and its size, both in cell sizes.
const DROPLETS = [
  { angle: 0, distance: 0.55, size: 0.16 },
  { angle: 1.2, distance: 0.45, size: 0.12 },
  { angle: 2.5, distance: 0.6, size: 0.14 },
  { angle: 3.7, distance: 0.4, size: 0.1 },
  { angle: 4.9, distance: 0.52, size: 0.13 },
];

interface SplashHandle {
  play(position: Position, color: string): void;
}

export function PaintSplashLayer() {
  const { cellSize } = useBoardLayout();
  const slots = useRef<(SplashHandle | null)[]>([]);
  const nextSlot = useRef(0);

  const playSplash = useCallback(({ position, color }: PaintSplash) => {
    const slot = slots.current[nextSlot.current];
    nextSlot.current = (nextSlot.current + 1) % SLOT_COUNT;
    slot?.play(position, color);
  }, []);

  usePaintSplashes(playSplash);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SLOTS.map((i) => (
        <Splash
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

interface SplashProps {
  cellSize: number;
}

const Splash = forwardRef<SplashHandle, SplashProps>(function Splash({ cellSize }, ref) {
  // 0 → 1 over one splash; a finished (or never played) slot sits at 1 and is hidden.
  const progress = useSharedValue(1);
  const row = useSharedValue(0);
  const col = useSharedValue(0);
  const spin = useSharedValue(0);
  const color = useSharedValue('transparent');

  useImperativeHandle(
    ref,
    () => ({
      play(position: Position, paintColor: string) {
        row.set(position.row);
        col.set(position.col);
        color.set(paintColor);
        spin.set(Math.random() * Math.PI * 2);
        // Restarts from 0 even when the slot is reused mid-splash.
        progress.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, SPLASH_TIMING)));
      },
    }),
    [row, col, color, spin, progress]
  );

  const cellStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 1 ? 1 : 0,
    transform: [{ translateX: col.value * cellSize }, { translateY: row.value * cellSize }],
  }));

  const blobSize = cellSize * BLOB_SIZE;
  const blobStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = interpolate(p, [0, 0.3, 1], [0.2, 1.05, 1.15]);
    // A jelly-like squash that peaks mid-splash, along an axis that varies with the spin.
    const wobble = Math.sin(p * Math.PI) * BLOB_WOBBLE;
    return {
      backgroundColor: color.value,
      opacity: interpolate(p, [0, 0.25, 1], [0.9, 0.75, 0]),
      transform: [
        { rotate: `${spin.value}rad` },
        { scaleX: scale * (1 + wobble) },
        { scaleY: scale * (1 - wobble) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.cell, { width: cellSize, height: cellSize }, cellStyle]}>
      <Animated.View
        style={[
          styles.piece,
          {
            width: blobSize,
            height: blobSize,
            borderRadius: blobSize * 0.42,
            left: (cellSize - blobSize) / 2,
            top: (cellSize - blobSize) / 2,
          },
          blobStyle,
        ]}
      />
      {DROPLETS.map((droplet, i) => (
        <Droplet key={i} {...droplet} cellSize={cellSize} progress={progress} spin={spin} color={color} />
      ))}
    </Animated.View>
  );
});

interface DropletProps {
  angle: number;
  distance: number;
  size: number;
  cellSize: number;
  progress: SharedValue<number>;
  spin: SharedValue<number>;
  color: SharedValue<string>;
}

function Droplet({ angle, distance, size, cellSize, progress, spin, color }: DropletProps) {
  const dropletSize = cellSize * size;
  const reach = cellSize * distance;

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const direction = angle + spin.value;
    return {
      backgroundColor: color.value,
      opacity: interpolate(p, [0, 0.6, 1], [1, 1, 0]),
      transform: [
        { translateX: Math.cos(direction) * reach * p },
        { translateY: Math.sin(direction) * reach * p },
        { scale: interpolate(p, [0, 1], [1, 0.4]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: dropletSize,
          height: dropletSize,
          borderRadius: dropletSize / 2,
          left: (cellSize - dropletSize) / 2,
          top: (cellSize - dropletSize) / 2,
        },
        animatedStyle,
      ]}
    />
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
});
