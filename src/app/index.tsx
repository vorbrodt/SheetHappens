import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DEFAULT_CONFIG } from '../game/store';

const DURATION_OPTIONS = [30, 60, 90, 120];

export default function MenuScreen() {
  const opacity = useSharedValue(0);
  const [duration, setDuration] = useState(DEFAULT_CONFIG.durationSeconds);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.badge, animatedStyle]} />
      <Text style={styles.title}>SheetHappens</Text>
      <View style={styles.durationRow} accessibilityRole="radiogroup" accessibilityLabel="Match length">
        {DURATION_OPTIONS.map((seconds) => {
          const selected = seconds === duration;
          return (
            <Pressable
              key={seconds}
              style={[styles.durationOption, selected && styles.durationOptionSelected]}
              onPress={() => setDuration(seconds)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${seconds} seconds`}
            >
              <Text style={[styles.durationText, selected && styles.durationTextSelected]}>
                {seconds}s
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Link href={{ pathname: '/game', params: { duration: String(duration) } }} asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Play</Text>
        </Pressable>
      </Link>
      <Link href="/jelly-preview" asChild>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Jelly Preview</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 16,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4f46e5',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  durationOptionSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  durationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    fontVariant: ['tabular-nums'],
  },
  durationTextSelected: {
    color: '#fff',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  secondaryButtonText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '600',
  },
});
