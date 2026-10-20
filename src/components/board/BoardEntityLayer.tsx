import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';

import { ActivePowerUp } from '../../game/powerups/types';
import { useGameStore } from '../../state/gameStore';
import { useMatchClock } from '../match/useMatchClock';
import { DeathSkin, RespawnDrop } from '../powerups/deathSkin';
import { POWER_UP_SKINS, SKIN_ACTIVATING_MS, SKIN_EXIT_TIMEOUT_MS } from '../powerups/skins';
import { SkinPhase } from '../powerups/types';
import { BoardJelly, SlideEnabledContext } from './BoardJelly';
import { BoardEntityViewModel } from './types';
import { useBoardLayout } from './useBoardLayout';

interface BoardEntityLayerProps {
  entities: BoardEntityViewModel[];
  // Cells per side of the board the jellies stand on.
  gridSize: number;
}

export function BoardEntityLayer({ entities, gridSize }: BoardEntityLayerProps) {
  const { cellSize } = useBoardLayout(gridSize);
  const clock = useMatchClock();
  // The game screen mounts with whatever positions the previous match left in the store and
  // resets them in its own mount effect, so nothing slides until that first frame has passed.
  const slideEnabled = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      slideEnabled.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <SlideEnabledContext.Provider value={slideEnabled}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {entities.map((entity) => (
          <BoardEntity key={entity.id} entity={entity} cellSize={cellSize} clock={clock} />
        ))}
      </View>
    </SlideEnabledContext.Provider>
  );
}

interface BoardEntityProps {
  entity: BoardEntityViewModel;
  cellSize: number;
  clock: SharedValue<number>;
}

// Draws one entity, dropping it back in each time it respawns.
function BoardEntity(props: BoardEntityProps) {
  return (
    <RespawnDrop entity={props.entity} cellSize={props.cellSize}>
      <EntityLook {...props} />
    </RespawnDrop>
  );
}

// How one entity looks: through its power-up's skin while one runs (and while that skin animates
// back out), through the death skin while it waits to respawn, and as the normal jelly otherwise.
function EntityLook({ entity, cellSize, clock }: BoardEntityProps) {
  const { activePowerUp } = entity;
  const [expiring, onExitDone] = useExpiringPowerUp(activePowerUp);
  const shown = activePowerUp ?? expiring;
  const activating = useGameStore(
    (s) => activePowerUp !== null && s.match.elapsedMs < activePowerUp.startedAt + SKIN_ACTIVATING_MS
  );
  const endsAt = activePowerUp?.endsAt ?? null;
  const remainingMs = useDerivedValue(() => (endsAt === null ? 0 : Math.max(0, endsAt - clock.value)));

  if (entity.dead) return <DeathSkin entity={entity} cellSize={cellSize} jellyRef={entity.ref} />;

  const Skin = shown ? POWER_UP_SKINS[shown.kind] : undefined;
  if (!Skin) {
    return <BoardJelly jellyRef={entity.ref} color={entity.color} position={entity.position} cellSize={cellSize} />;
  }

  const phase: SkinPhase = !activePowerUp ? 'expiring' : activating ? 'activating' : 'active';
  return (
    <Skin
      entity={entity}
      cellSize={cellSize}
      jellyRef={entity.ref}
      phase={phase}
      remainingMs={remainingMs}
      onExitDone={onExitDone}
    />
  );
}

// The power-up that just ran out on the entity, kept until its skin reports it has animated back
// to normal (or SKIN_EXIT_TIMEOUT_MS passes), together with that report's callback.
function useExpiringPowerUp(active: ActivePowerUp | null): [ActivePowerUp | null, () => void] {
  const [previous, setPrevious] = useState(active);
  const [expiring, setExpiring] = useState<ActivePowerUp | null>(null);

  if (active !== previous) {
    setPrevious(active);
    setExpiring(active ? null : previous);
  }

  const done = useCallback(() => setExpiring(null), []);

  useEffect(() => {
    if (!expiring) return;
    const timer = setTimeout(done, SKIN_EXIT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [expiring, done]);

  return [expiring, done];
}
