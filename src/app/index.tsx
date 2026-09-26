import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export default function MenuScreen() {
  const opacity = useSharedValue(0);

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
      <Link href="/game" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Play</Text>
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
});
