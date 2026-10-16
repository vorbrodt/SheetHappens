import { createRef, RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { GestureDetector } from 'react-native-gesture-handler';

import { Board } from '../components/board/Board';
import { BoardEntityLayer, BoardEntityViewModel } from '../components/board/BoardEntityLayer';
import { useBotController } from '../components/bots/useBotController';
import { useSwipeMovement } from '../components/gestures/useSwipeMovement';
import { IntensityReadout } from '../components/hud/IntensityReadout';
import { PaintButton } from '../components/hud/PaintButton';
import { JellyHandle } from '../components/jelly/types';
import { PLAYER_ID, useGameStore } from '../game/store';
import { Direction, PlayerId } from '../game/types';

export default function GameScreen() {
  const grid = useGameStore((s) => s.grid);
  const entities = useGameStore((s) => s.entities);
  // One stable ref per entity id, so jellies keep their handle across re-renders.
  const [jellyRefs] = useState(() => new Map<PlayerId, RefObject<JellyHandle | null>>());
  const [surfaceHeight, setSurfaceHeight] = useState(0);

  useEffect(() => {
    useGameStore.getState().initMatch();
  }, []);

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
    useGameStore.getState().paint(PLAYER_ID);
    getJelly(PLAYER_ID)?.playPaint();
  }, [getJelly]);

  const { gesture } = useSwipeMovement({ onMove: handleMove, surfaceHeight });

  const handleSurfaceLayout = useCallback((event: LayoutChangeEvent) => {
    setSurfaceHeight(event.nativeEvent.layout.height);
  }, []);

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

  return (
    <View style={styles.container}>
      <View style={styles.playArea}>
        <GestureDetector gesture={gesture}>
          <View style={styles.gestureSurface} onLayout={handleSurfaceLayout}>
            {currentCell && (
              <View style={styles.readout}>
                <IntensityReadout
                  intensity={currentCell.intensity}
                  ownerColor={currentCell.owner ? (ownerColors[currentCell.owner] ?? null) : null}
                />
              </View>
            )}
            <View style={styles.boardWrapper}>
              <Board cells={grid} ownerColors={ownerColors} />
              <BoardEntityLayer entities={boardEntities} />
            </View>
          </View>
        </GestureDetector>
        {/* Sits outside the swipe surface so paint taps never reach the pan gesture. */}
        {player && (
          <View style={styles.paintButton}>
            <PaintButton color={player.color} onPaint={handlePaint} />
          </View>
        )}
      </View>
      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Back to Menu</Text>
      </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  boardWrapper: {
    position: 'relative',
  },
  paintButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  button: {
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
