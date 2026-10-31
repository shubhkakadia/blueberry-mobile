import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert as Dialog, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { DinnerViews } from '@/components/dinner-views';
import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { Button, IconButton } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Icons } from '@/constants/icons';
import { Gutter, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dineApi, type Dish } from '@/lib/dine';

/** House · Dinner · Dishes, ported from the web's `DishLibrary.tsx`: the list every day's dropdown picks from. */
export default function DishesScreen() {
  const theme = useTheme();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await dineApi.dishes();
      if (id === requestId.current) setDishes(data.dishes);
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const addDish = async () => {
    if (submitting || draft.trim() === '') return;
    setSubmitting(true);
    setError(null);
    try {
      await dineApi.createDish(draft);
      setDraft('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const saveRename = async (dish: Dish) => {
    if (busyId !== null) return;
    const name = editDraft.trim();
    if (name === '' || name === dish.name) return setEditingId(null);
    setBusyId(dish.id);
    setError(null);
    try {
      await dineApi.renameDish(dish.id, name);
      setEditingId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const removeDish = async (id: number) => {
    if (busyId !== null) return;
    setBusyId(id);
    setError(null);
    try {
      await dineApi.removeDish(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = (dish: Dish) =>
    Dialog.alert(`Remove ${dish.name}?`, 'It comes off every day’s dropdown. Days that already chose it keep the name.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove dish', style: 'destructive', onPress: () => void removeDish(dish.id) },
    ]);

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <DinnerViews view="dishes" />

        <View style={styles.add}>
          <Input
            value={draft}
            onChangeText={setDraft}
            maxLength={120}
            accessibilityLabel="New dish"
            placeholder="Add a dish"
            returnKeyType="done"
            submitBehavior="submit"
            onSubmitEditing={() => void addDish()}
            style={styles.fill}
          />
          <Button
            variant="primary"
            disabled={draft.trim() === ''}
            loading={submitting}
            onPress={() => void addDish()}
            style={styles.addButton}>
            Add
          </Button>
        </View>

        {error && (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <View style={styles.header}>
          <ThemedText type="eyebrow" themeColor="fgMuted" accessibilityRole="header">
            Shared dishes
          </ThemedText>
          {!loading && (
            <ThemedText type="meta" themeColor="fgMuted" style={styles.tabular}>
              {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'}
            </ThemedText>
          )}
        </View>

        {loading ? (
          <View accessibilityLabel="Loading dishes" style={[styles.panel, { backgroundColor: theme.surface }]}>
            {[0, 1, 2, 3].map((key) => (
              <View key={key} style={[styles.row, key > 0 && { borderTopWidth: 1, borderColor: theme.hairline }]}>
                <SkeletonBlock style={{ height: 14, width: '45%' }} />
              </View>
            ))}
          </View>
        ) : dishes.length === 0 ? (
          <View style={[styles.panel, { backgroundColor: theme.surface, boxShadow: theme.shadowE1 }]}>
            <EmptyState
              icon={Icons.dish}
              title="No dishes yet"
              body="Add the first one above. Every day of the dinner week picks from this list."
            />
          </View>
        ) : (
          <View style={[styles.panel, { backgroundColor: theme.surface, boxShadow: theme.shadowE1 }]}>
            {dishes.map((dish, index) => {
              const busy = busyId === dish.id;
              const divider = index > 0 && { borderTopWidth: 1, borderColor: theme.hairline };
              return editingId === dish.id ? (
                <View key={dish.id} style={[styles.row, styles.editRow, divider]}>
                  <Input
                    autoFocus
                    value={editDraft}
                    maxLength={120}
                    fieldSize="md"
                    accessibilityLabel={`Rename ${dish.name}`}
                    returnKeyType="done"
                    onChangeText={setEditDraft}
                    onSubmitEditing={() => void saveRename(dish)}
                    style={styles.fill}
                  />
                  <Button variant="primary" size="md" loading={busy} onPress={() => void saveRename(dish)}>
                    Save
                  </Button>
                  <Button variant="ghost" size="md" disabled={busy} onPress={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </View>
              ) : (
                <View key={dish.id} style={[styles.row, divider, busy && styles.busy]}>
                  <ThemedText style={[styles.fill, styles.medium]}>{dish.name}</ThemedText>
                  <IconButton
                    icon={Icons.pencil}
                    label={`Rename ${dish.name}`}
                    disabled={busyId !== null}
                    onPress={() => {
                      setEditDraft(dish.name);
                      setEditingId(dish.id);
                    }}
                  />
                  <IconButton
                    icon={Icons.trash}
                    label={`Remove ${dish.name}`}
                    disabled={busyId !== null}
                    onPress={() => confirmRemove(dish)}
                  />
                </View>
              );
            })}
          </View>
        )}

        <ThemedText type="meta" themeColor="fgMuted" style={styles.footer}>
          Removing a dish takes it off the dropdown. Past weeks that used it still show its name.
        </ThemedText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  medium: { fontWeight: '500' },
  tabular: { fontVariant: ['tabular-nums'] },
  content: { padding: Gutter, paddingBottom: 40, gap: 14 },
  add: { flexDirection: 'row', gap: 8 },
  addButton: { height: 48, borderRadius: Radius.field, paddingHorizontal: 18 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  panel: { borderRadius: Radius.panel, paddingLeft: 16, paddingRight: 8, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 56 },
  editRow: { gap: 6, paddingVertical: 6 },
  busy: { opacity: 0.5 },
  footer: { paddingHorizontal: 4 },
});
