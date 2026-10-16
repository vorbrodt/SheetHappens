import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
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

  const playAgain = () => router.replace({ pathname: '/game', params: toMatchParams(config) });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {headline(winners, localPlayerId)}
        </Text>
        {winners.length > 1 && (
          <Text style={styles.subtitle}>
            Joint winners: {winners.map((w) => entityName(w.id, localPlayerId)).join(', ')}
          </Text>
        )}
        <View style={styles.list}>
          <ResultHeader />
          {standings.map((s) => (
            <ResultRow
              key={s.id}
              rank={s.rank}
              name={entityName(s.id, localPlayerId)}
              color={colors[s.id]}
              score={s.score}
              cellsOwned={s.cellsOwned}
              winner={s.rank === 1}
            />
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
        <Pressable style={styles.button} onPress={playAgain}>
          <Text style={styles.buttonText}>Play Again</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.dismissTo('/')}>
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
