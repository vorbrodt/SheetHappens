import { Pressable, StyleSheet, Text, View } from 'react-native';

interface PauseDialogProps {
  onResume: () => void;
  onLeave: () => void;
}

/** Shown over the paused match; leaving needs this second, explicit tap. */
export function PauseDialog({ onResume, onLeave }: PauseDialogProps) {
  return (
    <View style={styles.backdrop} accessibilityViewIsModal>
      <View style={styles.card} accessibilityRole="alert">
        <Text style={styles.title} accessibilityRole="header">
          Paused
        </Text>
        <Text style={styles.message}>Leave the match? This match won&apos;t be saved.</Text>
        <Pressable style={styles.resumeButton} onPress={onResume} accessibilityRole="button">
          <Text style={styles.resumeText}>Resume</Text>
        </Pressable>
        <Pressable style={styles.leaveButton} onPress={onLeave} accessibilityRole="button">
          <Text style={styles.leaveText}>Leave Match</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: '#111827',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 4,
  },
  resumeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  resumeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  leaveText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
