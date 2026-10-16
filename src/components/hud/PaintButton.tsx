import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export const PAINT_BUTTON_SIZE = 72;
const ICON_SIZE = 34;
const PRESSED_SCALE = 0.88;

// Fire-and-forget: the promise is never awaited so the paint itself is never delayed, and a
// failed haptic (e.g. Low Power Mode on iOS) is silently ignored. Android uses the system haptic
// constants rather than impactAsync, which falls back to the cruder Vibrator API there.
function paintHaptic() {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } else if (Platform.OS === 'android') {
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Keyboard_Tap).catch(() => {});
  }
}

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
          paintHaptic();
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
    width: PAINT_BUTTON_SIZE,
    height: PAINT_BUTTON_SIZE,
    borderRadius: PAINT_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
