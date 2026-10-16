import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Jelly } from '../components/jelly/Jelly';
import { Direction, JellyHandle, JellyRenderer } from '../components/jelly/types';

const PREVIEW_COLORS = ['#EC4899', '#2563EB', '#DC2626', '#16A34A'];
const JELLY_SIZE = 72;
const RENDERERS: { renderer: JellyRenderer; label: string }[] = [
  { renderer: 'procedural', label: 'Procedural (Reanimated)' },
  { renderer: 'lottie', label: 'Lottie idle (KAN-16 prototype)' },
];

export default function JellyPreviewScreen() {
  const jellyRefs = useRef<(JellyHandle | null)[]>([]);

  const triggerMove = (direction: Direction) => {
    jellyRefs.current.forEach((handle) => handle?.playMove(direction));
  };

  const triggerPaint = () => {
    jellyRefs.current.forEach((handle) => handle?.playPaint());
  };

  return (
    <View style={styles.container}>
      {RENDERERS.map(({ renderer, label }, rowIndex) => (
        <View key={renderer} style={styles.rendererRow}>
          <Text style={styles.rendererLabel}>{label}</Text>
          <View style={styles.jellyRow}>
            {PREVIEW_COLORS.map((color, index) => (
              <Jelly
                key={color}
                ref={(handle) => {
                  jellyRefs.current[rowIndex * PREVIEW_COLORS.length + index] = handle;
                }}
                color={color}
                size={JELLY_SIZE}
                renderer={renderer}
              />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.dPad}>
        <PreviewButton label="▲" onPress={() => triggerMove('up')} />
        <View style={styles.dPadMiddleRow}>
          <PreviewButton label="◀" onPress={() => triggerMove('left')} />
          <PreviewButton label="▶" onPress={() => triggerMove('right')} />
        </View>
        <PreviewButton label="▼" onPress={() => triggerMove('down')} />
      </View>

      <Pressable style={[styles.button, styles.paintButton]} onPress={triggerPaint}>
        <Text style={styles.buttonText}>Paint</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Back to Menu</Text>
      </Pressable>
    </View>
  );
}

function PreviewButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.dPadButton} onPress={onPress}>
      <Text style={styles.dPadButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 24,
  },
  rendererRow: {
    alignItems: 'center',
    gap: 8,
  },
  rendererLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  jellyRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dPad: {
    alignItems: 'center',
    gap: 8,
  },
  dPadMiddleRow: {
    flexDirection: 'row',
    gap: 48,
  },
  dPadButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  dPadButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
  },
  paintButton: {
    backgroundColor: '#DB2777',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
