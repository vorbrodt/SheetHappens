import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { ActivePowerUp, PowerUpKind } from '../../game/powerups/types';
import { useGameStore } from '../../state/gameStore';
import { useMatchClock } from '../match/useMatchClock';
import { POWER_UP_NAMES, PowerUpIcon } from '../powerups/PowerUpIcon';
import { measureInWindow, WindowRect } from '../powerups/windowRect';

export const SLOT_SIZE = 64;
const ICON_SIZE = 48;
const SLOT_RADIUS = 16;
const RING_WIDTH = 4;
// The ring runs along the middle of the slot's border.
const RING_SIDE = SLOT_SIZE - RING_WIDTH;
const RING_RADIUS = SLOT_RADIUS - RING_WIDTH / 2;
const RING_LENGTH = 4 * (RING_SIDE - 2 * RING_RADIUS) + 2 * Math.PI * RING_RADIUS;
const DIMMED_OPACITY = 0.4;
const FLIGHT_MS = 450;
const SHAKE_STEP_MS = 50;

const EMPTY_INVENTORY: (PowerUpKind | null)[] = [null, null];

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface PowerUpSlotsHandle {
  // Flies the icon of what just went into `slot` in from `from` (where the pickup lay on the
  // board), rather than having it simply appear.
  receive(slot: number, from: Promise<WindowRect | null>): void;
  // Shakes a slot whose power-up was refused.
  shake(slot: number): void;
}

interface PowerUpSlotsProps {
  // The local player's color, for the countdown ring.
  color: string;
}

/**
 * The local player's two power-up slots. Tapping a filled slot uses it. While a power-up runs, both
 * slots are dimmed and disabled, and the slot it came from shows a ring counting down its time.
 */
export const PowerUpSlots = forwardRef<PowerUpSlotsHandle, PowerUpSlotsProps>(function PowerUpSlots(
  { color },
  ref
) {
  const inventory = useGameStore(
    (s) => s.match.entities.find((e) => e.id === s.localPlayerId)?.inventory ?? EMPTY_INVENTORY
  );
  const active = useGameStore(
    (s) => s.match.entities.find((e) => e.id === s.localPlayerId)?.activePowerUp ?? null
  );
  const activate = useGameStore((s) => s.usePowerUp);
  const clock = useMatchClock();
  // The slot last tapped, which is where a running power-up came from.
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const slots = useRef<(SlotHandle | null)[]>([]);

  useImperativeHandle(
    ref,
    () => ({
      receive: (slot, from) => slots.current[slot]?.receive(from),
      shake: (slot) => slots.current[slot]?.shake(),
    }),
    []
  );

  return (
    <View style={styles.row}>
      {inventory.map((kind, index) => {
        const runningHere = active !== null && activeSlot === index;
        return (
          <Slot
            key={index}
            ref={(handle) => {
              slots.current[index] = handle;
            }}
            index={index}
            // The slot a running power-up came from keeps showing it until something new arrives.
            kind={kind ?? (runningHere ? active.kind : null)}
            dimmed={active !== null}
            ring={runningHere ? active : null}
            color={color}
            clock={clock}
            onPress={() => {
              setActiveSlot(index);
              activate(index as 0 | 1);
            }}
          />
        );
      })}
    </View>
  );
});

interface SlotHandle {
  receive(from: Promise<WindowRect | null>): void;
  shake(): void;
}

interface SlotProps {
  index: number;
  kind: PowerUpKind | null;
  dimmed: boolean;
  // The running power-up to count down around this slot, if any.
  ring: ActivePowerUp | null;
  color: string;
  clock: SharedValue<number>;
  onPress: () => void;
}

const Slot = forwardRef<SlotHandle, SlotProps>(function Slot(
  { index, kind, dimmed, ring, color, clock, onPress },
  ref
) {
  const view = useRef<View>(null);
  const shakeX = useSharedValue(0);
  const flightX = useSharedValue(0);
  const flightY = useSharedValue(0);
  const flightScale = useSharedValue(1);
  const flightOpacity = useSharedValue(1);

  useImperativeHandle(
    ref,
    () => ({
      receive(from) {
        // Hidden until the flight can start, so the icon never flashes up in the slot first.
        flightOpacity.set(0);
        Promise.all([from, measureInWindow(view.current)]).then(([source, target]) => {
          flightOpacity.set(1);
          if (!source || !target) return;
          flightX.set(source.x + source.width / 2 - (target.x + target.width / 2));
          flightY.set(source.y + source.height / 2 - (target.y + target.height / 2));
          flightScale.set(source.width / ICON_SIZE);
          // Different easings on each axis curve the path into an arc.
          flightX.set(withTiming(0, { duration: FLIGHT_MS, easing: Easing.out(Easing.quad) }));
          flightY.set(withTiming(0, { duration: FLIGHT_MS, easing: Easing.in(Easing.quad) }));
          flightScale.set(
            withSequence(
              withTiming(1, { duration: FLIGHT_MS, easing: Easing.inOut(Easing.quad) }),
              withTiming(1.2, { duration: 90, easing: Easing.out(Easing.quad) }),
              withTiming(1, { duration: 140, easing: Easing.inOut(Easing.quad) })
            )
          );
        });
      },
      shake() {
        shakeX.set(
          withSequence(
            withTiming(-6, { duration: SHAKE_STEP_MS }),
            withTiming(6, { duration: SHAKE_STEP_MS }),
            withTiming(-4, { duration: SHAKE_STEP_MS }),
            withTiming(4, { duration: SHAKE_STEP_MS }),
            withTiming(0, { duration: SHAKE_STEP_MS })
          )
        );
      },
    }),
    [flightOpacity, flightX, flightY, flightScale, shakeX]
  );

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: flightOpacity.value,
    transform: [{ translateX: flightX.value }, { translateY: flightY.value }, { scale: flightScale.value }],
  }));

  const label = kind ? `Power-up slot ${index + 1}: ${POWER_UP_NAMES[kind]}` : `Power-up slot ${index + 1}: empty`;

  return (
    <Animated.View style={shakeStyle}>
      <Pressable
        ref={view}
        onPress={onPress}
        disabled={!kind || dimmed}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !kind || dimmed }}
        style={[styles.slot, kind ? styles.filled : styles.empty]}
      >
        <View style={dimmed && styles.dimmed}>
          <Animated.View style={iconStyle}>{kind && <PowerUpIcon kind={kind} size={ICON_SIZE} />}</Animated.View>
        </View>
      </Pressable>
      {ring && <CountdownRing active={ring} color={color} clock={clock} />}
    </Animated.View>
  );
});

interface CountdownRingProps {
  active: ActivePowerUp;
  color: string;
  clock: SharedValue<number>;
}

// A ring around the slot's edge that drains clockwise as the power-up's time runs out.
function CountdownRing({ active: { startedAt, endsAt }, color, clock }: CountdownRingProps) {
  const animatedProps = useAnimatedProps(() => {
    const left = Math.min(1, Math.max(0, (endsAt - clock.value) / Math.max(1, endsAt - startedAt)));
    return { strokeDashoffset: RING_LENGTH * (1 - left) };
  });

  return (
    <View style={styles.ring} pointerEvents="none">
      <Svg width={SLOT_SIZE} height={SLOT_SIZE}>
        <AnimatedRect
          x={RING_WIDTH / 2}
          y={RING_WIDTH / 2}
          width={RING_SIDE}
          height={RING_SIDE}
          rx={RING_RADIUS}
          stroke={color}
          strokeWidth={RING_WIDTH}
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          fill="none"
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_RADIUS,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  filled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F1F2F4',
  },
  dimmed: {
    opacity: DIMMED_OPACITY,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
