import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Pressable } from '@/components/ui/pressable';
import { Icons } from '@/constants/icons';
import { useRuntime } from '@/hooks/use-runtime';
import { useTheme } from '@/hooks/use-theme';
import { PRESETS } from '@/lib/runtime';

/**
 * Four ranges fill the row; the filter sits at the end for a room or a custom
 * period, which the presets cannot express. Selected is ink, as for any choice
 * that is navigation rather than action.
 */
export function RuntimeRange() {
  const theme = useTheme();
  const runtime = useRuntime();

  return (
    <View style={styles.row}>
      <View accessibilityLabel="Time range" style={styles.pills}>
        {PRESETS.map((option) => {
          const selected = runtime.range === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => !selected && runtime.setRange(option.value)}
              style={({ pressed }) => [
                styles.pill,
                selected
                  ? { backgroundColor: theme.select, borderColor: theme.select }
                  : { backgroundColor: theme.surface, borderColor: theme.hairlineStrong },
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="sm"
                numberOfLines={1}
                style={[styles.label, { color: selected ? theme.selectFg : theme.fg }]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={runtime.filtered ? 'Filter runtime (filter on)' : 'Filter runtime'}
        onPress={() => router.push('/activity/filter')}
        style={({ pressed }) => [
          styles.filter,
          runtime.filtered
            ? { backgroundColor: theme.select, borderColor: theme.select }
            : { backgroundColor: theme.surface, borderColor: theme.hairlineStrong },
          pressed && styles.pressed,
        ]}>
        <SymbolView name={Icons.sliders} size={18} tintColor={runtime.filtered ? theme.selectFg : theme.fg} />
        {runtime.filtered && <View style={[styles.dot, { backgroundColor: theme.accent, borderColor: theme.canvas }]} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pills: { flex: 1, flexDirection: 'row', gap: 6 },
  pill: { flex: 1, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  label: { fontWeight: '600' },
  pressed: { transform: [{ scale: 0.94 }] },
  filter: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
