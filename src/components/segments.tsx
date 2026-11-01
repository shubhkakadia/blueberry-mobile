import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Pressable } from '@/components/ui/pressable';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A tab's sections - Now | Timers - as the web's segmented header. Each section
 * is its own route; switching replaces rather than pushes, so Back leaves the tab.
 */
export function Segments({ items, selected }: { items: { label: string; href: Href }[]; selected: number }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.track, { backgroundColor: theme.segmentTrack }]}>
      {items.map((item, index) => {
        const active = index === selected;
        return (
          <Pressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => !active && router.replace(item.href)}
            style={({ pressed }) => [
              styles.segment,
              active && { backgroundColor: theme.segment, boxShadow: theme.shadowSegment },
              pressed && !active && styles.pressed,
            ]}>
            <ThemedText
              type="body"
              numberOfLines={1}
              style={{ color: active ? theme.fg : theme.fgBody, fontWeight: active ? '600' : '500' }}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: Radius.track, marginBottom: 16 },
  segment: { flex: 1, minHeight: 40, borderRadius: Radius.segment, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pressed: { transform: [{ scale: 0.96 }] },
});
