import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Menu' }} />
        <Stack.Screen name="game" options={{ title: 'Game' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
