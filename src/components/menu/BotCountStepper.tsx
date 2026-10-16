import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clampBotCount, MAX_BOTS, MIN_BOTS } from './matchConfig';

interface BotCountStepperProps {
  value: number;
  onChange: (value: number) => void;
}

export function BotCountStepper({ value, onChange }: BotCountStepperProps) {
  const step = (delta: number) => onChange(clampBotCount(value + delta));
  const canDecrement = value > MIN_BOTS;
  const canIncrement = value < MAX_BOTS;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Bots"
      accessibilityValue={{ min: MIN_BOTS, max: MAX_BOTS, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <StepButton label="−" disabled={!canDecrement} onPress={() => step(-1)} />
      <Text style={styles.value}>{value}</Text>
      <StepButton label="+" disabled={!canIncrement} onPress={() => step(1)} />
    </View>
  );
}

function StepButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  value: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
  },
  buttonPressed: {
    backgroundColor: '#4338ca',
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
});
