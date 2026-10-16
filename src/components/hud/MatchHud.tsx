import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { formatTime } from '../match/formatTime';

const LOW_TIME_MS = 10_000;
const LOW_TIME_COLOR = '#EF4444';
const LABEL_COLOR = '#6B7280';
const PAUSE_BUTTON_SIZE = 40;

interface MatchHudProps {
  remainingMs: number;
  score: number;
  cellsOwned: number;
  color: string;
  onPause: () => void;
}

export function MatchHud({ remainingMs, score, cellsOwned, color, onPause }: MatchHudProps) {
  const time = formatTime(remainingMs);
  const lowTime = remainingMs <= LOW_TIME_MS;

  return (
    <View style={styles.container}>
      <View style={styles.side}>
        <Pressable
          style={styles.pauseButton}
          onPress={onPause}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Pause"
        >
          <SymbolView
            name={{ ios: 'pause.fill', android: 'pause', web: 'pause' }}
            tintColor="#111827"
            size={22}
          />
        </Pressable>
        <View style={styles.stat} accessible accessibilityLabel={`Score ${score}`}>
          <Text style={[styles.statValue, { color }]}>{score}</Text>
          <Text style={styles.label}>Score</Text>
        </View>
      </View>
      <View
        style={styles.timer}
        accessible
        accessibilityRole="timer"
        accessibilityLabel={`Time remaining ${time}`}
      >
        <Text style={[styles.timerValue, lowTime && { color: LOW_TIME_COLOR }]}>{time}</Text>
      </View>
      <View style={[styles.side, styles.sideEnd]}>
        <View style={styles.stat} accessible accessibilityLabel={`Cells owned ${cellsOwned}`}>
          <Text style={[styles.statValue, { color }]}>{cellsOwned}</Text>
          <Text style={styles.label}>Cells</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Equal-width sides keep the timer centered even though only the left side has a button.
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideEnd: {
    justifyContent: 'flex-end',
  },
  pauseButton: {
    width: PAUSE_BUTTON_SIZE,
    height: PAUSE_BUTTON_SIZE,
    borderRadius: PAUSE_BUTTON_SIZE / 2,
    backgroundColor: '#F1F2F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stat: {
    minWidth: 56,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    // Keeps the numbers from jittering as digits change.
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: LABEL_COLOR,
    textTransform: 'uppercase',
  },
  timer: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F1F2F4',
  },
  timerValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
});
