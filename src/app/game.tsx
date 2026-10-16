import { createRef, RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Board } from '../components/board/Board';
import { BoardEntityLayer, BoardEntityViewModel } from '../components/board/BoardEntityLayer';
import { BoardSpace, BoardSpaceProvider } from '../components/board/useBoardLayout';
import { useBotController } from '../components/bots/useBotController';
import { useSwipeMovement } from '../components/gestures/useSwipeMovement';
import { IntensityReadout } from '../components/hud/IntensityReadout';
import { MatchHud } from '../components/hud/MatchHud';
import { PAINT_BUTTON_SIZE, PaintButton } from '../components/hud/PaintButton';
import { PauseDialog } from '../components/hud/PauseDialog';
import { JellyHandle } from '../components/jelly/types';
import { CountdownOverlay } from '../components/match/CountdownOverlay';
import { useMatchClock } from '../components/match/useMatchClock';
import { MatchParams, parseMatchParams } from '../components/menu/matchConfig';
import { cellsOwned, score } from '../game/rules';
import { PLAYER_ID, useGameStore } from '../game/store';
import { Direction, PlayerId } from '../game/types';

const CONTROLS_MARGIN = 16;

export default function GameScreen() {
  const { duration, bots } = useLocalSearchParams<MatchParams>();
  const grid = useGameStore((s) => s.grid);
  const entities = useGameStore((s) => s.entities);
  const remainingMs = useGameStore((s) => s.remainingMs);
  // One stable ref per entity id, so jellies keep their handle across re-renders.
  const [jellyRefs] = useState(() => new Map<PlayerId, RefObject<JellyHandle | null>>());
  const [boardSpace, setBoardSpace] = useState<BoardSpace | null>(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    useGameStore.getState().initMatch(parseMatchParams({ duration, bots }));
  }, [duration, bots]);

  // Reacts to the moment the match ends rather than to the status itself, so a stale "ended"
  // left in the store by the previous match never skips this one.
  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.status === 'ended' && prev.status !== 'ended') {
          router.replace('/results');
        }
      }),
    []
  );

  const jellyRefFor = (id: PlayerId) => {
    let ref = jellyRefs.get(id);
    if (!ref) {
      ref = createRef<JellyHandle>();
      jellyRefs.set(id, ref);
    }
    return ref;
  };

  const getJelly = useCallback((id: PlayerId) => jellyRefs.get(id)?.current ?? null, [jellyRefs]);

  useBotController(getJelly);
  useMatchClock();

  const openPause = useCallback(() => {
    if (useGameStore.getState().status === 'ended') return;
    useGameStore.getState().setPaused(true);
    setPauseOpen(true);
  }, []);

  const resume = useCallback(() => {
    setPauseOpen(false);
    useGameStore.getState().setPaused(false);
  }, []);

  const leave = useCallback(() => {
    setPauseOpen(false);
    router.dismissTo('/');
  }, []);

  // The clock resumes (match or countdown) when the app returns to the foreground, so re-pause
  // while asking.
  useEffect(() => {
    if (!pauseOpen) return;
    return useGameStore.subscribe((state) => {
      if (state.status === 'playing' || state.status === 'countdown') state.setPaused(true);
    });
  }, [pauseOpen]);

  // Android back goes through the same pause dialog, and closes it again when it is open.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pauseOpen) resume();
      else openPause();
      return true;
    });
    return () => subscription.remove();
  }, [pauseOpen, openPause, resume]);

  const handleBoardAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoardSpace((prev) =>
      prev?.width === width && prev?.height === height ? prev : { width, height }
    );
  }, []);

  const handleMove = useCallback(
    (direction: Direction) => {
      const prevEntities = useGameStore.getState().entities;
      useGameStore.getState().move(PLAYER_ID, direction);
      if (useGameStore.getState().entities !== prevEntities) {
        getJelly(PLAYER_ID)?.playMove(direction);
      }
    },
    [getJelly]
  );

  const handlePaint = useCallback(() => {
    if (useGameStore.getState().status !== 'playing') return;
    useGameStore.getState().paint(PLAYER_ID);
    getJelly(PLAYER_ID)?.playPaint();
  }, [getJelly]);

  const { gesture } = useSwipeMovement({ onMove: handleMove });

  const ownerColors = useMemo(
    () => Object.fromEntries(entities.map((e) => [e.id, e.color])),
    [entities]
  );

  const player = entities.find((e) => e.id === PLAYER_ID);
  const boardEntities: BoardEntityViewModel[] = entities.map((e) => ({
    id: e.id,
    color: e.color,
    position: e.position,
    ref: jellyRefFor(e.id),
  }));
  const currentCell = player ? grid[player.position.row][player.position.col] : null;
  const playerScore = useMemo(() => score(grid, PLAYER_ID), [grid]);
  const playerCells = useMemo(() => cellsOwned(grid, PLAYER_ID), [grid]);

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
                    <BoardEntityLayer entities={boardEntities} />
                  </View>
                </BoardSpaceProvider>
              )}
            </View>
            {/* Reserves the paint button's row, so the board is never sized under it. */}
            <View style={styles.controlsRow} />
          </View>
        </GestureDetector>
        {/* Sits outside the swipe surface so paint taps never reach the pan gesture. */}
        {player && (
          <View style={styles.paintButton}>
            <PaintButton color={player.color} onPaint={handlePaint} />
          </View>
        )}
      </View>
      <CountdownOverlay />
      {pauseOpen && <PauseDialog onResume={resume} onLeave={leave} />}
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
  controlsRow: {
    height: PAINT_BUTTON_SIZE + CONTROLS_MARGIN,
  },
  paintButton: {
    position: 'absolute',
    right: CONTROLS_MARGIN,
    bottom: CONTROLS_MARGIN,
  },
});
