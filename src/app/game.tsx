import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { GestureDetector } from 'react-native-gesture-handler';

import { Board } from '../components/board/Board';
import { BoardEntityLayer, BoardEntityViewModel } from '../components/board/BoardEntityLayer';
import { useSwipeMovement } from '../components/gestures/useSwipeMovement';
import { JellyHandle } from '../components/jelly/types';
import { PLAYER_ID, useGameStore } from '../game/store';
import { Direction } from '../game/types';

export default function GameScreen() {
  const grid = useGameStore((s) => s.grid);
  const entities = useGameStore((s) => s.entities);
  const playerJellyRef = useRef<JellyHandle>(null);
  const [surfaceHeight, setSurfaceHeight] = useState(0);

  useEffect(() => {
    useGameStore.getState().initMatch();
  }, []);

  const handleMove = useCallback((direction: Direction) => {
    const prevEntities = useGameStore.getState().entities;
    useGameStore.getState().move(PLAYER_ID, direction);
    if (useGameStore.getState().entities !== prevEntities) {
      playerJellyRef.current?.playMove(direction);
    }
  }, []);

  const { gesture } = useSwipeMovement({ onMove: handleMove, surfaceHeight });

  const handleSurfaceLayout = useCallback((event: LayoutChangeEvent) => {
    setSurfaceHeight(event.nativeEvent.layout.height);
  }, []);

  const player = entities.find((e) => e.id === PLAYER_ID);
  const boardEntities: BoardEntityViewModel[] = player
    ? [{ id: player.id, color: player.color, position: player.position, ref: playerJellyRef }]
    : [];

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <View style={styles.gestureSurface} onLayout={handleSurfaceLayout}>
          <View style={styles.boardWrapper}>
            <Board cells={grid} />
            <BoardEntityLayer entities={boardEntities} />
          </View>
        </View>
      </GestureDetector>
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
  gestureSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardWrapper: {
    position: 'relative',
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
