import { Pressable, StyleSheet, Text, View } from 'react-native';

interface OptionPillsProps {
  // Names the group for screen readers.
  label: string;
  options: number[];
  value: number;
  onChange: (value: number) => void;
  // What the pill shows, and what a screen reader says for it.
  formatOption: (option: number) => string;
  describeOption: (option: number) => string;
}

// A row of pills that works as a radio group: exactly one option is selected.
export function OptionPills({ label, options, value, onChange, formatOption, describeOption }: OptionPillsProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={describeOption(option)}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>{formatOption(option)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  optionSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    fontVariant: ['tabular-nums'],
  },
  textSelected: {
    color: '#fff',
  },
});
