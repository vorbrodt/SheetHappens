import { useEffect, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  SharedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SkinPhase } from '../types';

// Deep purple, nearly black: the tint the jelly darkens to and the colour of its aura.
export const EVIL_DARK = '#1E0B2E';
export const EVIL_AURA = '#581C87';
export const EVIL_RED = '#FF2D2D';

// How long the expiring animation runs before the entity is handed back to the normal jelly.
const EXPIRE_MS = 950;
// How long one heavy wobble takes, there and back.
const WOBBLE_MS = 1_700;
// The evil grin flashes up every few seconds while active.
const GRIN_EVERY_MS = 1_800;
const GRIN_JITTER_MS = 1_800;
const GRIN_HOLD_MS = 650;

/**
 * Where each part of the evil look is, 0 (normal jelly) to 1 (fully evil), driven by the skin's
 * phase. Brows can slam past 1, and the aura's flicker and the wobble loop for as long as it runs.
 */
export interface EvilLook {
  // The dark tint over the jelly, the red eyes in place of its normal ones.
  evil: SharedValue<number>;
  brows: SharedValue<number>;
  horns: SharedValue<number>;
  aura: SharedValue<number>;
  flicker: SharedValue<number>;
  wobble: SharedValue<number>;
  grin: SharedValue<number>;
  // The normal face's eyes after the colour washes back: 1 open, 0 shut.
  blink: SharedValue<number>;
}

export function useEvilLook(phase: SkinPhase, onExitDone: () => void): EvilLook {
  // Mounted after the activating phase (the entity respawned mid-power-up, say), it starts evil.
  const [startEvil] = useState(phase === 'activating' ? 0 : 1);
  const evil = useSharedValue(startEvil);
  const brows = useSharedValue(startEvil);
  const horns = useSharedValue(startEvil);
  const aura = useSharedValue(startEvil);
  const flicker = useSharedValue(0);
  const wobble = useSharedValue(0);
  const grin = useSharedValue(0);
  const blink = useSharedValue(1);
  const expiring = phase === 'expiring';

  // Activate: the tint floods in, the brows slam down, the horns sprout and the aura swells.
  useEffect(() => {
    evil.set(withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }));
    brows.set(
      withDelay(
        80,
        withSequence(
          withTiming(1.15, { duration: 110, easing: Easing.in(Easing.quad) }),
          withSpring(1, { damping: 8, stiffness: 260 })
        )
      )
    );
    horns.set(withDelay(150, withSpring(1, { damping: 7, stiffness: 180 })));
    aura.set(withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    wobble.set(withRepeat(withTiming(1, { duration: WOBBLE_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    // Irregular steps, so the aura flickers instead of pulsing.
    flicker.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 90 }),
          withTiming(0.3, { duration: 60 }),
          withTiming(0.8, { duration: 140 }),
          withTiming(0.2, { duration: 220 }),
          withTiming(1, { duration: 120 }),
          withTiming(0.5, { duration: 330 })
        ),
        -1
      )
    );
    return () => {
      cancelAnimation(wobble);
      cancelAnimation(flicker);
    };
  }, [evil, brows, horns, aura, wobble, flicker]);

  // Active: every so often an evil grin spreads across its face.
  useEffect(() => {
    if (expiring) return;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleGrin = () => {
      timer = setTimeout(() => {
        grin.set(
          withSequence(
            withTiming(1, { duration: 160, easing: Easing.out(Easing.back(2)) }),
            withDelay(GRIN_HOLD_MS, withTiming(0, { duration: 200 }))
          )
        );
        scheduleGrin();
      }, GRIN_EVERY_MS + Math.random() * GRIN_JITTER_MS);
    };
    scheduleGrin();
    return () => clearTimeout(timer);
  }, [expiring, grin]);

  // Expire: the aura implodes, the horns shrink, the colour washes back and the jelly blinks,
  // sheepishly, twice.
  useEffect(() => {
    if (!expiring) return;
    aura.set(withTiming(0, { duration: 260, easing: Easing.in(Easing.back(3)) }));
    horns.set(withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }));
    brows.set(withTiming(0, { duration: 200 }));
    grin.set(withTiming(0, { duration: 120 }));
    evil.set(withDelay(150, withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) })));
    blink.set(
      withDelay(
        600,
        withSequence(
          withTiming(0.1, { duration: 70 }),
          withTiming(1, { duration: 100 }),
          withTiming(0.1, { duration: 70 }),
          withTiming(1, { duration: 110 })
        )
      )
    );
    const timer = setTimeout(onExitDone, EXPIRE_MS);
    return () => clearTimeout(timer);
  }, [expiring, onExitDone, aura, horns, brows, grin, evil, blink]);

  return { evil, brows, horns, aura, flicker, wobble, grin, blink };
}
