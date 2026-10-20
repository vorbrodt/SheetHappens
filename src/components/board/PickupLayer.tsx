import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { PICKUP_BLINK_MS } from '../../game/powerups/pickups';
import { Pickup } from '../../game/powerups/types';
import { useGameStore } from '../../state/gameStore';
import { useMatchClock } from '../match/useMatchClock';
import { PowerUpIcon } from '../powerups/PowerUpIcon';
import { measureInWindow, WindowRect } from '../powerups/windowRect';
import { useBoardLayout } from './useBoardLayout';

// The icon's size, in cell sizes.
const ICON_SCALE = 0.72;
const POP_IN_MS = 350;
const POP_OUT_MS = 250;
// One on-off cycle of the blink before a pickup disappears.
const BLINK_PERIOD_MS = 300;
const BOB_PERIOD_MS = 1_400;
// How far the icon bobs up and down, in cell sizes.
const BOB_HEIGHT = 0.05;

export interface PickupLayerHandle {
  // Where the pickup's icon is on screen, for flying it to the slot it went into. The store has
  // already taken it off the board, so it isn't drawn any more.
  locate(pickup: Pickup): Promise<WindowRect | null>;
  // Pops the pickup out where it lay, once it has left the board without going to a slot.
  popOut(pickup: Pickup): void;
}

interface LeavingPickup {
  pickup: Pickup;
  // When it left the board, on the match clock.
  leftAt: number;
}

interface PickupLayerProps {
  // Cells per side of the board the pickups lie on.
  gridSize: number;
}

/**
 * The power-ups lying on the board, each on its cell: they pop in when they spawn, bob gently,
 * blink for their last PICKUP_BLINK_MS and pop out when they despawn. Animations follow the match
 * clock, so they hold still while paused.
 */
export const PickupLayer = forwardRef<PickupLayerHandle, PickupLayerProps>(function PickupLayer(
  { gridSize },
  ref
) {
  const { cellSize } = useBoardLayout(gridSize);
  const clock = useMatchClock();
  const pickups = useGameStore((s) => s.match.pickups);
  const [leaving, setLeaving] = useState<LeavingPickup[]>([]);
  const container = useRef<View>(null);
  const iconSize = cellSize * ICON_SCALE;

  useImperativeHandle(
    ref,
    () => ({
      async locate({ position }) {
        const board = await measureInWindow(container.current);
        if (!board) return null;
        const inset = (cellSize - iconSize) / 2;
        return {
          x: board.x + position.col * cellSize + inset,
          y: board.y + position.row * cellSize + inset,
          width: iconSize,
          height: iconSize,
        };
      },
      popOut(pickup) {
        const leftAt = useGameStore.getState().match.elapsedMs;
        setLeaving((current) => [...current, { pickup, leftAt }]);
        // Wall-clock, with room to spare in case the match pauses mid-pop.
        setTimeout(() => setLeaving((current) => current.filter((l) => l.pickup.id !== pickup.id)), POP_OUT_MS * 2);
      },
    }),
    [cellSize, iconSize]
  );

  const live = new Set(pickups.map((p) => p.id));

  return (
    <View ref={container} style={StyleSheet.absoluteFill} pointerEvents="none">
      {pickups.map((pickup) => (
        <PickupIcon key={pickup.id} pickup={pickup} leftAt={null} cellSize={cellSize} clock={clock} />
      ))}
      {leaving
        .filter(({ pickup }) => !live.has(pickup.id))
        .map(({ pickup, leftAt }) => (
          <PickupIcon key={pickup.id} pickup={pickup} leftAt={leftAt} cellSize={cellSize} clock={clock} />
        ))}
    </View>
  );
});

interface PickupIconProps {
  pickup: Pickup;
  // When it left the board, on the match clock, or null while it's still there.
  leftAt: number | null;
  cellSize: number;
  clock: SharedValue<number>;
}

function PickupIcon({ pickup: { kind, position, spawnedAt, expiresAt }, leftAt, cellSize, clock }: PickupIconProps) {
  const iconSize = cellSize * ICON_SCALE;
  const bobHeight = cellSize * BOB_HEIGHT;
  // Spreads the bob out, so pickups spawned together don't move in lockstep.
  const bobOffset = (position.row * 3 + position.col * 7) * 0.5;

  const iconStyle = useAnimatedStyle(() => {
    const now = clock.value;
    const popIn = interpolate(now - spawnedAt, [0, POP_IN_MS * 0.6, POP_IN_MS], [0, 1.15, 1], 'clamp');
    const popOut = leftAt === null ? 1 : interpolate(now - leftAt, [0, POP_OUT_MS * 0.3, POP_OUT_MS], [1, 1.2, 0], 'clamp');
    const timeLeft = expiresAt - now;
    const blinkedOff = leftAt === null && timeLeft < PICKUP_BLINK_MS && timeLeft % BLINK_PERIOD_MS < BLINK_PERIOD_MS / 2;
    const bob = Math.sin((now / BOB_PERIOD_MS) * Math.PI * 2 + bobOffset);
    return {
      opacity: blinkedOff ? 0.25 : 1,
      transform: [{ translateY: -bobHeight * (1 + bob) }, { scale: popIn * popOut }],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const now = clock.value;
    const bob = Math.sin((now / BOB_PERIOD_MS) * Math.PI * 2 + bobOffset);
    const popIn = interpolate(now - spawnedAt, [0, POP_IN_MS], [0, 1], 'clamp');
    const popOut = leftAt === null ? 1 : interpolate(now - leftAt, [0, POP_OUT_MS], [1, 0], 'clamp');
    // Shrinks as the icon rises.
    return { transform: [{ scale: popIn * popOut * (1 - bob * 0.15) }] };
  });

  return (
    <View
      style={[
        styles.cell,
        { width: cellSize, height: cellSize, left: position.col * cellSize, top: position.row * cellSize },
      ]}
    >
      <Animated.View
        style={[
          styles.shadow,
          { width: iconSize * 0.6, height: iconSize * 0.16, borderRadius: iconSize * 0.08, bottom: cellSize * 0.08 },
          shadowStyle,
        ]}
      />
      <Animated.View style={iconStyle}>
        <PowerUpIcon kind={kind} size={iconSize} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(17, 24, 39, 0.18)',
  },
});
