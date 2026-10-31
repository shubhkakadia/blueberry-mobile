import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** Live / Offline: whether the bridge can reach the console. The dot turns accent while a command is in flight. */
export function ConnectionPill({ connected, pending }: { connected: boolean; pending: number }) {
  const theme = useTheme();
  const dot = !connected ? theme.danger : pending > 0 ? theme.accent : theme.positiveDot;
  return (
    <View
      accessible
      accessibilityLabel={connected ? 'Connected to the bridge' : 'The bridge is offline'}
      style={[styles.pill, { backgroundColor: theme.glass }]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <ThemedText type="xs" style={[styles.label, { color: theme.accentDeep }]}>
        {connected ? 'Live' : 'Offline'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, borderRadius: 14, paddingHorizontal: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontWeight: '600' },
});
