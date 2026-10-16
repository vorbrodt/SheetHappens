import { StyleSheet, Text, View } from 'react-native';

const LABEL_COLOR = '#6B7280';

interface ResultRowProps {
  rank: number;
  name: string;
  color: string;
  score: number;
  cellsOwned: number;
  winner: boolean;
}

export function ResultRow({ rank, name, color, score, cellsOwned, winner }: ResultRowProps) {
  return (
    <View
      style={[styles.row, winner && [styles.winnerRow, { borderColor: color }]]}
      accessible
      accessibilityLabel={`${winner ? 'Winner, ' : ''}rank ${rank}, ${name}, score ${score}, ${cellsOwned} cells`}
    >
      <Text style={[styles.rank, winner && styles.winnerText]}>{rank}</Text>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <View style={styles.nameColumn}>
        <Text style={[styles.name, winner && styles.winnerText]} numberOfLines={1}>
          {name}
        </Text>
        {winner && <Text style={[styles.badge, { color }]}>Winner</Text>}
      </View>
      <Text style={[styles.value, winner && styles.winnerText]}>{score}</Text>
      <Text style={[styles.value, styles.cells]}>{cellsOwned}</Text>
    </View>
  );
}

// Column headings lined up with ResultRow's values.
export function ResultHeader() {
  return (
    <View style={[styles.row, styles.headerRow]} importantForAccessibility="no-hide-descendants">
      <Text style={[styles.rank, styles.headerText]}>#</Text>
      <View style={styles.swatchSpacer} />
      <Text style={[styles.nameColumn, styles.headerText]}>Player</Text>
      <Text style={[styles.value, styles.headerText]}>Score</Text>
      <Text style={[styles.value, styles.headerText]}>Cells</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  winnerRow: {
    paddingVertical: 16,
    backgroundColor: '#FEF9C3',
  },
  headerRow: {
    paddingVertical: 4,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: LABEL_COLOR,
    textTransform: 'uppercase',
  },
  rank: {
    width: 20,
    fontSize: 16,
    fontWeight: '600',
    color: LABEL_COLOR,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  swatchSpacer: {
    width: 24,
  },
  nameColumn: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: {
    width: 56,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  cells: {
    color: LABEL_COLOR,
  },
  winnerText: {
    fontWeight: '800',
    color: '#111827',
  },
});
