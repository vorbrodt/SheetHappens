import { useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotCountStepper } from '../components/menu/BotCountStepper';
import { BOARD_SIZE_OPTIONS, DURATION_OPTIONS, toMatchParams } from '../components/menu/matchConfig';
import { MenuBackground } from '../components/menu/MenuBackground';
import { OptionPills } from '../components/menu/OptionPills';
import { DEFAULT_CONFIG } from '../game/engine';

// Only Android lets an app close itself: iOS apps must not quit programmatically, and a browser
// tab can't be closed from script, so Quit is not offered there.
const CAN_QUIT = Platform.OS === 'android';

export default function MenuScreen() {
  const [duration, setDuration] = useState(DEFAULT_CONFIG.durationSeconds);
  const [botCount, setBotCount] = useState(DEFAULT_CONFIG.botCount);
  const [boardSize, setBoardSize] = useState(DEFAULT_CONFIG.boardSize);

  return (
    <View style={styles.screen}>
      <MenuBackground />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            SheetHappens
          </Text>
          <Text style={styles.tagline}>Paint the board. Out-jelly the bots.</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Match length</Text>
            <OptionPills
              label="Match length"
              options={DURATION_OPTIONS}
              value={duration}
              onChange={setDuration}
              formatOption={(seconds) => `${seconds}s`}
              describeOption={(seconds) => `${seconds} seconds`}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Map size</Text>
            <OptionPills
              label="Map size"
              options={BOARD_SIZE_OPTIONS}
              value={boardSize}
              onChange={setBoardSize}
              formatOption={(size) => `${size}×${size}`}
              describeOption={(size) => `${size} by ${size}`}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Bots</Text>
            <BotCountStepper value={botCount} onChange={setBotCount} />
          </View>

          <View style={styles.actions}>
            {/* A plain Pressable rather than `Link asChild`: the Link's Slot spreads the child's
                style as an object, which drops a function style and left the button invisible. */}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() =>
                router.push({
                  pathname: '/game',
                  params: toMatchParams({ durationSeconds: duration, botCount, boardSize }),
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Start match"
            >
              <Text style={styles.buttonText}>Start</Text>
            </Pressable>
            {CAN_QUIT && (
              <Pressable style={styles.secondaryButton} onPress={() => BackHandler.exitApp()}>
                <Text style={styles.secondaryButtonText}>Quit</Text>
              </Pressable>
            )}
          </View>

          {__DEV__ && (
            <Link href="/jelly-preview" style={styles.devLink}>
              Jelly Preview
            </Link>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EEF2FF',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#312e81',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#4f46e5',
  },
  tagline: {
    marginTop: -12,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#6B7280',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 4,
  },
  button: {
    paddingVertical: 14,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: '#4338ca',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4f46e5',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '600',
  },
  devLink: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});
