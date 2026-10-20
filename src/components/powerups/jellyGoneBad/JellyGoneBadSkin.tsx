import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useGameStore } from '../../../state/gameStore';
import { BoardSlide, jellySizeFor } from '../../board/BoardJelly';
import { Jelly } from '../../jelly/Jelly';
import { SkinProps } from '../types';
import { EvilAura } from './EvilAura';
import { EvilFace } from './EvilFace';
import { EvilVignette } from './EvilVignette';
import { KillSplats } from './KillSplats';
import { useEvilLook } from './useEvilLook';

const WOBBLE_TILT_DEG = 4;
const WOBBLE_SQUISH = 0.05;

/**
 * The jelly gone bad: darkened, with red eyes, angry brows and horns, a flickering aura and a slow,
 * heavy wobble. Whoever it kills splats, and the local player's screen darkens at the edges as it
 * turns. When it runs out the jelly turns back with a sheepish blink.
 */
export function JellyGoneBadSkin({ entity, cellSize, jellyRef, phase, onExitDone }: SkinProps) {
  const size = jellySizeFor(cellSize);
  const look = useEvilLook(phase, onExitDone);
  const isLocalPlayer = useGameStore((s) => s.localPlayerId === entity.id);
  // Only when it has just turned, not when the skin mounts with the power-up already running.
  const [vignette] = useState(phase === 'activating');
  const { evil, wobble } = look;

  const wobbleStyle = useAnimatedStyle(() => {
    const swing = (wobble.value - 0.5) * 2 * evil.value;
    return {
      transform: [
        { rotate: `${swing * WOBBLE_TILT_DEG}deg` },
        { scaleX: 1 + swing * WOBBLE_SQUISH },
        { scaleY: 1 - swing * WOBBLE_SQUISH },
      ],
    };
  });

  return (
    <>
      <KillSplats killerId={entity.id} cellSize={cellSize} />
      <BoardSlide position={entity.position} cellSize={cellSize}>
        <EvilAura size={size} look={look} />
        <Animated.View style={[styles.wobble, wobbleStyle]}>
          <Jelly ref={jellyRef} color={entity.color} size={size} showFace={false}>
            <EvilFace size={size} look={look} />
          </Jelly>
        </Animated.View>
      </BoardSlide>
      {isLocalPlayer && vignette && <EvilVignette />}
    </>
  );
}

const styles = StyleSheet.create({
  wobble: {
    transformOrigin: 'center bottom',
  },
});
