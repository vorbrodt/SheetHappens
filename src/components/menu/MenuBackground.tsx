import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { WanderingJelly } from './WanderingJelly';

// The player's pink plus the bot colors, in a spread of sizes.
const BACKGROUND_JELLIES = [
  { color: '#EC4899', size: 64 },
  { color: '#f97316', size: 48 },
  { color: '#3b82f6', size: 72 },
  { color: '#22c55e', size: 52 },
  { color: '#eab308', size: 44 },
  { color: '#a855f7', size: 60 },
  { color: '#3b82f6', size: 40 },
  { color: '#EC4899', size: 50 },
];

// Fills its parent behind the menu. Touches pass straight through, and screen readers skip it.
export function MenuBackground() {
  const [area, setArea] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {area.width > 0 &&
        BACKGROUND_JELLIES.map((jelly, index) => (
          <WanderingJelly
            key={index}
            color={jelly.color}
            size={jelly.size}
            areaWidth={area.width}
            areaHeight={area.height}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
});
