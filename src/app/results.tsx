import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toMatchParams } from '../components/menu/matchConfig';
import { entityName } from '../components/results/entityName';
import { ResultHeader, ResultRow } from '../components/results/ResultRow';
import { rankEntities, Standing } from '../game/rules';
import { PlayerId } from '../game/types';
import { useGameStore } from '../state/gameStore';

function headline(winners: Standing[], localPlayerId: PlayerId): string {
  if (winners.length > 1) return "It's a tie!";
  if (winners[0]?.id === localPlayerId) return 'You win!';
  return winners[0] ? `${entityName(winners[0].id, localPlayerId)} wins!` : "Time's up!";
}

const ACTIONS_MARGIN = 24;
// Button taps are ignored this long after the screen appears, so taps still spamming in from the
// match can't fire them.
const BUTTON_GUARD_MS = 500;
// Scoreboard rows slide in one after another, starting once the headline has popped.
const ROWS_DELAY_MS = 250;
const ROW_STAGGER_MS = 110;

export default function ResultsScreen() {
  const grid = useGameStore((s) => s.match.grid);
  const entities = useGameStore((s) => s.match.entities);
  const config = useGameStore((s) => s.config);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const insets = useSafeAreaInsets();

  const standings = useMemo(
    () => rankEntities(grid, entities.map((e) => e.id)),
    [grid, entities]
  );
  const winners = standings.filter((s) => s.rank === 1);
  const colors = useMemo(() => Object.fromEntries(entities.map((e) => [e.id, e.color])), [entities]);

  const armed = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      armed.current = true;
    }, BUTTON_GUARD_MS);
    return () => clearTimeout(timer);
  }, []);
  const guarded = (action: () => void) => () => {
    if (armed.current) action();
  };

  const playAgain = () => router.replace({ pathname: '/game', params: toMatchParams(config) });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.Text
          style={styles.title}
          accessibilityRole="header"
          entering={ZoomIn.springify().damping(10)}
        >
          {headline(winners, localPlayerId)}
        </Animated.Text>
        {winners.length > 1 && (
          <Animated.Text style={styles.subtitle} entering={FadeIn.delay(ROWS_DELAY_MS)}>
            Joint winners: {winners.map((w) => entityName(w.id, localPlayerId)).join(', ')}
          </Animated.Text>
        )}
        <View style={styles.list}>
          <Animated.View entering={FadeIn.delay(ROWS_DELAY_MS)}>
            <ResultHeader />
          </Animated.View>
          {standings.map((s, i) => (
            <Animated.View
              key={s.id}
              // Winners pop in; everyone else drops into place below them.
              entering={(s.rank === 1 ? ZoomIn : FadeInDown)
                .delay(ROWS_DELAY_MS + i * ROW_STAGGER_MS)
                .springify()
                .damping(12)}
            >
              <ResultRow
                rank={s.rank}
                name={entityName(s.id, localPlayerId)}
                color={colors[s.id]}
                score={s.score}
                cellsOwned={s.cellsOwned}
                winner={s.rank === 1}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      {/* The header covers the top inset; the buttons must clear the home indicator / nav bar. */}
      <View
        style={[
          styles.actions,
          {
            paddingBottom: ACTIONS_MARGIN + insets.bottom,
            paddingLeft: ACTIONS_MARGIN + insets.left,
            paddingRight: ACTIONS_MARGIN + insets.right,
          },
        ]}
      >
        <Pressable style={styles.button} onPress={guarded(playAgain)}>
          <Text style={styles.buttonText}>Play Again</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={guarded(() => router.dismissTo('/'))}
        >
          <Text style={styles.secondaryButtonText}>Back to Menu</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  list: {
    marginTop: 16,
    gap: 6,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4f46e5',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '600',
  },
});
