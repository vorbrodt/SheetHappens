import { createRef, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Board } from '../components/board/Board';
import { BoardEntityLayer } from '../components/board/BoardEntityLayer';
import { PaintSplashLayer } from '../components/board/PaintSplashLayer';
import { PickupLayer, PickupLayerHandle } from '../components/board/PickupLayer';
import { BoardEntityViewModel } from '../components/board/types';
import { BoardSpace, BoardSpaceProvider } from '../components/board/useBoardLayout';
import { useSwipeMovement } from '../components/gestures/useSwipeMovement';
import { IntensityReadout } from '../components/hud/IntensityReadout';
import { MatchHud } from '../components/hud/MatchHud';
import { PauseDialog } from '../components/hud/PauseDialog';
import { PowerUpSlots, PowerUpSlotsHandle } from '../components/hud/PowerUpSlots';
import { JellyHandle } from '../components/jelly/types';
import { CountdownOverlay } from '../components/match/CountdownOverlay';
import { GameOverOverlay } from '../components/match/GameOverOverlay';
import { useGameLoop } from '../components/match/useGameLoop';
import { useMatchAnimations } from '../components/match/useMatchAnimations';
import { MatchParams, parseMatchParams } from '../components/menu/matchConfig';
import { cellsOwned, score } from '../game/rules';
import { PlayerId } from '../game/types';
import { useGameStore } from '../state/gameStore';

export default function GameScreen() {
  const { duration, bots, size } = useLocalSearchParams<MatchParams>();
  const grid = useGameStore((s) => s.match.grid);
  const entities = useGameStore((s) => s.match.entities);
  // Rounded up to whole seconds (all the HUD shows), so the every-frame game loop only re-renders
  // the screen once a second.
  const remainingMs = useGameStore((s) => Math.ceil(s.match.remainingMs / 1000) * 1000);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  // One stable ref per entity id, so jellies keep their handle across re-renders.
  const [jellyRefs] = useState(() => new Map<PlayerId, RefObject<JellyHandle | null>>());
  const [boardSpace, setBoardSpace] = useState<BoardSpace | null>(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const pickupLayer = useRef<PickupLayerHandle>(null);
  const powerUpSlots = useRef<PowerUpSlotsHandle>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    useGameStore.getState().initMatch(parseMatchParams({ duration, bots, size }));
  }, [duration, bots, size]);

  // Reacts to the moment the match ends rather than to the status itself, so a stale "ended"
  // left in the store by the previous match never skips this one. The game-over overlay plays
  // first and moves on to the results itself.
  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.match.status === 'ended' && prev.match.status !== 'ended') {
          setGameOver(true);
        }
      }),
    []
  );

  const showResults = useCallback(() => router.replace('/results'), []);

  const jellyRefFor = (id: PlayerId) => {
    let ref = jellyRefs.get(id);
    if (!ref) {
      ref = createRef<JellyHandle>();
      jellyRefs.set(id, ref);
    }
    return ref;
  };

  const getJelly = useCallback((id: PlayerId) => jellyRefs.get(id)?.current ?? null, [jellyRefs]);

  useMatchAnimations({ getJelly, pickups: pickupLayer, slots: powerUpSlots });
  useGameLoop();

  const openPause = useCallback(() => {
    if (useGameStore.getState().match.status === 'ended') return;
    useGameStore.getState().setPaused('menu', true);
    setPauseOpen(true);
  }, []);

  const resume = useCallback(() => {
    setPauseOpen(false);
    useGameStore.getState().setPaused('menu', false);
  }, []);

  const leave = useCallback(() => {
    setPauseOpen(false);
    router.dismissTo('/');
  }, []);

  // Android back goes through the same pause dialog, and closes it again when it is open. Once the
  // match is over it does nothing, so the game-over overlay plays out.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (gameOver) return true;
      if (pauseOpen) resume();
      else openPause();
      return true;
    });
    return () => subscription.remove();
  }, [gameOver, pauseOpen, openPause, resume]);

  const handleBoardAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardSpace((prev) =>
      prev?.width === width && prev?.height === height ? prev : { width, height }
    );
  }, []);

  const holdDirection = useGameStore((s) => s.holdDirection);
  const { gesture } = useSwipeMovement({ onDirectionChange: holdDirection });

  const ownerColors = useMemo(
    () => Object.fromEntries(entities.map((e) => [e.id, e.color])),
    [entities]
  );

  const player = entities.find((e) => e.id === localPlayerId);
  const boardEntities: BoardEntityViewModel[] = entities.map((e) => ({
    id: e.id,
    color: e.color,
    position: e.position,
    footprint: e.footprint,
    activePowerUp: e.activePowerUp,
    ghost: e.ghost,
    dead: e.respawnAt !== null,
    summonedBy: e.summonedBy,
    ref: jellyRefFor(e.id),
  }));
  const currentCell = player ? grid[player.position.row][player.position.col] : null;
  const playerScore = useMemo(() => score(grid, localPlayerId), [grid, localPlayerId]);
  const playerCells = useMemo(() => cellsOwned(grid, localPlayerId), [grid, localPlayerId]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {player && (
        <MatchHud
          remainingMs={remainingMs}
          score={playerScore}
          cellsOwned={playerCells}
          color={player.color}
          onPause={openPause}
        />
      )}
      <View style={styles.playArea}>
        <GestureDetector gesture={gesture}>
          <View style={styles.gestureSurface}>
            {/* In normal flow above the board, so it can never cover the top row. */}
            {currentCell && (
              <View style={styles.readout}>
                <IntensityReadout
                  intensity={currentCell.intensity}
                  ownerColor={currentCell.owner ? (ownerColors[currentCell.owner] ?? null) : null}
                />
              </View>
            )}
            <View style={styles.boardArea} onLayout={handleBoardAreaLayout}>
              {/* Sized from the measured area, so nothing renders until the first layout pass. */}
              {boardSpace && (
                <BoardSpaceProvider value={boardSpace}>
                  <View style={styles.boardWrapper}>
                    <Board cells={grid} ownerColors={ownerColors} />
                    <PaintSplashLayer gridSize={grid.length} />
                    <PickupLayer ref={pickupLayer} gridSize={grid.length} />
                    <BoardEntityLayer entities={boardEntities} gridSize={grid.length} />
                  </View>
                </BoardSpaceProvider>
              )}
            </View>
          </View>
        </GestureDetector>
      </View>
      {/* Outside the swipe surface, so tapping a slot never starts a swipe. */}
      {player && <PowerUpSlots ref={powerUpSlots} color={player.color} />}
      <CountdownOverlay />
      {pauseOpen && <PauseDialog onResume={resume} onLeave={leave} />}
      {gameOver && <GameOverOverlay onDone={showResults} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  playArea: {
    flex: 1,
  },
  gestureSurface: {
    flex: 1,
  },
  readout: {
    alignItems: 'center',
    paddingTop: 4,
  },
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardWrapper: {
    position: 'relative',
  },
});
