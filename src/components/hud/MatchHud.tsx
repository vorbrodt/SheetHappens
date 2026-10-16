import { StyleSheet, Text, View } from 'react-native';

import { formatTime } from '../match/formatTime';

const LOW_TIME_MS = 10_000;
const LOW_TIME_COLOR = '#EF4444';
const LABEL_COLOR = '#6B7280';

interface MatchHudProps {
  remainingMs: number;
  score: number;
  cellsOwned: number;
  color: string;
}

export function MatchHud({ remainingMs, score, cellsOwned, color }: MatchHudProps) {
  const time = formatTime(remainingMs);
  const lowTime = remainingMs <= LOW_TIME_MS;

  return (
    <View style={styles.container}>
      <View style={styles.stat} accessible accessibilityLabel={`Score ${score}`}>
        <Text style={[styles.statValue, { color }]}>{score}</Text>
        <Text style={styles.label}>Score</Text>
      </View>
      <View
        style={styles.timer}
        accessible
        accessibilityRole="timer"
        accessibilityLabel={`Time remaining ${time}`}
      >
        <Text style={[styles.timerValue, lowTime && { color: LOW_TIME_COLOR }]}>{time}</Text>
      </View>
      <View style={styles.stat} accessible accessibilityLabel={`Cells owned ${cellsOwned}`}>
        <Text style={[styles.statValue, { color }]}>{cellsOwned}</Text>
        <Text style={styles.label}>Cells</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stat: {
    minWidth: 72,
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
