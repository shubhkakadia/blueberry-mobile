import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * A filter pill. Selected is ink on paper inverted - not the accent - because
 * picking a list or a range is navigation, and the accent is kept for things
 * that act on the house.
 */
export function Chip({
  selected = false,
  disabled = false,
  onPress,
  children,
}: {
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: theme.select, borderColor: theme.select }
          : { backgroundColor: theme.surface, borderColor: theme.hairlineStrong },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <ThemedText type="sm" numberOfLines={1} style={[styles.label, { color: selected ? theme.selectFg : theme.fg }]}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

/** Pills that wrap onto as many lines as they need. */
export function ChipRow({ children, accessibilityLabel }: { children: ReactNode; accessibilityLabel?: string }) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.row}>
      {children}
    </View>
  );
}

/** A read-only label, e.g. a room a timer runs. */
export function Tag({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: theme.surfaceInset }]}>
      <ThemedText type="meta" themeColor="fgBody" numberOfLines={1} style={styles.tagLabel}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '600' },
  pressed: { transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { height: 28, paddingHorizontal: 10, borderRadius: 14, justifyContent: 'center' },
  tagLabel: { fontWeight: '500' },
});
