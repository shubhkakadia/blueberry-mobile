import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Gutter } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A filter pill. Selected is ink on paper inverted - not the accent - because
 * picking a list or a range is navigation, and the accent is kept for things
 * that act on the house.
 */
export function Chip({
  selected = false,
  disabled = false,
  count,
  onPress,
  children,
}: {
  selected?: boolean;
  disabled?: boolean;
  /** Small badge after the label, e.g. items left on a list. */
  count?: number;
  onPress: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const ink = selected ? theme.selectFg : theme.fg;
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
      <ThemedText type="sm" numberOfLines={1} style={[styles.label, { color: ink }]}>
        {children}
      </ThemedText>
      {count !== undefined && (
        <View style={[styles.count, { backgroundColor: selected ? 'rgba(255, 255, 255, 0.2)' : theme.surfaceInset }]}>
          <ThemedText type="xs" style={[styles.countLabel, { color: ink }]}>
            {count}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Pills that wrap onto as many lines as they need, or with `scroll` stay on one
 * line and run off the screen edge rather than off a margin.
 */
export function ChipRow({
  children,
  scroll = false,
  accessibilityLabel,
}: {
  children: ReactNode;
  scroll?: boolean;
  accessibilityLabel?: string;
}) {
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={accessibilityLabel}
        style={styles.rail}
        contentContainerStyle={styles.railContent}>
        {children}
      </ScrollView>
    );
  }
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
  chip: {
    flexDirection: 'row',
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600' },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  countLabel: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  rail: { marginHorizontal: -Gutter, flexGrow: 0 },
  railContent: { gap: 8, paddingHorizontal: Gutter },
  pressed: { transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { height: 28, paddingHorizontal: 10, borderRadius: 14, justifyContent: 'center' },
  tagLabel: { fontWeight: '500' },
});
