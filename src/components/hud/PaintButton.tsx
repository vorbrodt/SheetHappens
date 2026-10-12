import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const BUTTON_SIZE = 72;
const ICON_SIZE = 34;
const PRESSED_SCALE = 0.88;

interface PaintButtonProps {
  color: string;
  onPaint: () => void;
}

export function PaintButton({ color, onPaint }: PaintButtonProps) {
  const scale = useSharedValue(1);

  const gesture = useMemo(
    () =>
      // A gesture rather than a Pressable so taps still land while another finger is holding a
      // swipe, and onBegin (touch-down) rather than release so every tap registers instantly.
      Gesture.Tap()
        .runOnJS(true)
        .onBegin(() => {
          scale.set(withTiming(PRESSED_SCALE, { duration: 60 }));
          onPaint();
        })
        .onFinalize(() => {
          scale.set(withSpring(1, { damping: 10, stiffness: 220 }));
        }),
    [onPaint, scale]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.button, { backgroundColor: color }, animatedStyle]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Paint"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onPaint}
      >
        <SymbolView
          name={{ ios: 'paintbrush.fill', android: 'brush', web: 'brush' }}
          tintColor="#fff"
          size={ICON_SIZE}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
