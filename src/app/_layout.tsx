import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Menu', headerShown: false }} />
        {/* The HUD's pause button is the only way out, so the header and iOS swipe-back go. */}
        <Stack.Screen
          name="game"
          options={{ title: 'Game', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="results" options={{ title: 'Results', headerBackVisible: false }} />
        <Stack.Screen name="jelly-preview" options={{ title: 'Jelly Preview' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
