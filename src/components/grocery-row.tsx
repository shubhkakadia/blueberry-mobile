import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ThemedText } from '@/components/themed-text';
import { Pressable } from '@/components/ui/pressable';
import { Icons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { formatAddedAt, type ChecklistItem } from '@/lib/checklists';

/** Width of the action revealed behind a swiped row, as the web's `--swipe-action-w`. */
const ACTION_WIDTH = 88;

/**
 * One item on a shopping list. Tap the circle to tick it; swipe left to remove.
 * `onOpen` hands the parent this row's swipe, so it can close the last one.
 */
export function GroceryRow({
  item,
  first,
  removing,
  onToggle,
  onRemove,
  onOpen,
}: {
  item: ChecklistItem;
  first: boolean;
  removing: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onOpen: (row: SwipeableMethods | null) => void;
}) {
  const theme = useTheme();
  const swipe = useRef<SwipeableMethods>(null);
  const done = item.completed;

  return (
    <ReanimatedSwipeable
      ref={swipe}
      enabled={!removing}
      friction={1.5}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      onSwipeableWillOpen={() => onOpen(swipe.current)}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name}`}
          onPress={() => {
            swipe.current?.close();
            onRemove();
          }}
          style={[styles.action, { backgroundColor: theme.danger }]}>
          <SymbolView name={Icons.trash} size={20} tintColor={theme.surface} />
          <ThemedText type="xs" style={[styles.actionLabel, { color: theme.surface }]}>
            Remove
          </ThemedText>
        </Pressable>
      )}>
      {/* Opaque, so the action behind the row only shows once it slides. */}
      <View
        accessibilityActions={[{ name: 'remove', label: 'Remove' }]}
        onAccessibilityAction={(event) => event.nativeEvent.actionName === 'remove' && onRemove()}
        style={[styles.row, { backgroundColor: done ? theme.surfaceDim : theme.surface }, removing && styles.removing]}>
        <View style={[styles.inner, { minHeight: done ? 60 : 64 }, !first && { borderTopWidth: 1, borderColor: theme.hairline }]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done, disabled: removing }}
            accessibilityLabel={`${done ? 'Move back to list' : 'Mark bought'}: ${item.name}`}
            disabled={removing}
            onPress={onToggle}
            style={({ pressed }) => [styles.tick, pressed && styles.pressed]}>
            <CheckCircle checked={done} />
          </Pressable>
          <View style={styles.text}>
            <ThemedText style={done ? [styles.doneName, { color: theme.fgMuted }] : styles.name}>{item.name}</ThemedText>
            {/* Who put it on the list is what makes a shared list work. */}
            <ThemedText type="xs" themeColor="fgMuted" numberOfLines={1}>
              {item.addedByUsername} · {formatAddedAt(item.createdAt)}
            </ThemedText>
          </View>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

/** The round tick of a shopping list: an empty ring, or a filled disc with a tick. */
function CheckCircle({ checked }: { checked: boolean }) {
  const theme = useTheme();
  return checked ? (
    <View style={[styles.circle, { backgroundColor: theme.fgMuted }]}>
      <SymbolView name={Icons.check} size={14} tintColor={theme.surface} />
    </View>
  ) : (
    <View style={[styles.circle, styles.ring, { borderColor: theme.fgDisabled }]} />
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16 },
  removing: { opacity: 0.5 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tick: { width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.85 }] },
  circle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 2 },
  text: { flex: 1, minWidth: 0, paddingVertical: 8, gap: 2 },
  name: { fontWeight: '500' },
  doneName: { textDecorationLine: 'line-through' },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionLabel: { fontWeight: '600' },
});
