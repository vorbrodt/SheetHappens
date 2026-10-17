import { StyleSheet, Text, View } from 'react-native';

import { MAX_INTENSITY } from '../../game/rules';

const NEUTRAL_TEXT_COLOR = '#6B7280';

interface IntensityReadoutProps {
  intensity: number;
  ownerColor: string | null;
}

export function IntensityReadout({ intensity, ownerColor }: IntensityReadoutProps) {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Current cell intensity ${intensity} of ${MAX_INTENSITY}`}
    >
      <Text style={[styles.value, { color: ownerColor ?? NEUTRAL_TEXT_COLOR }]}>
        {intensity}
        <Text style={styles.max}>/{MAX_INTENSITY}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 88,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F2F4',
    alignItems: 'center',
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    // Keeps the pill from jittering as digits change during rapid tapping.
    fontVariant: ['tabular-nums'],
  },
  max: {
    fontSize: 24,
    color: NEUTRAL_TEXT_COLOR,
  },
});
