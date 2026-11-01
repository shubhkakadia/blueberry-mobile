import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert as Dialog, AppState, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';

import { GroceryRow } from '@/components/grocery-row';
import { Segments } from '@/components/segments';
import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { fadeOut, riseIn, settle } from '@/components/ui/motion';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { HOUSE_SECTIONS } from '@/constants/sections';
import { Gutter, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  byListOrder,
  checklistApi,
  defaultChecklistId,
  type ChecklistItem,
  type ChecklistSummary,
} from '@/lib/checklists';

/** House · Groceries, ported from the web's `Checklist.tsx`. */
export default function GroceriesScreen() {
  const theme = useTheme();
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsRequestId = useRef(0);
  // The rows last committed, so an optimistic change builds on what is shown
  // rather than on a render's possibly stale snapshot.
  const itemsRef = useRef<ChecklistItem[]>([]);
  // Ticks waiting on the server. A read taken before one lands would undo it.
  const pendingToggles = useRef(new Set<number>());
  const selectedIdRef = useRef<number | null>(null);
  const openRow = useRef<SwipeableMethods | null>(null);

  /** Shows `next` and keeps the pill count of its list in step. */
  const applyItems = useCallback((checklistId: number, next: ChecklistItem[]) => {
    itemsRef.current = next;
    setItems(next);
    const open = next.filter((item) => !item.completed).length;
    setChecklists((current) =>
      current.map((checklist) => (checklist.id === checklistId ? { ...checklist, openCount: open } : checklist)),
    );
  }, []);

  /** Picks a list and loads it behind a skeleton. */
  const showList = useCallback(
    async (id: number) => {
      selectedIdRef.current = id;
      setSelectedId(id);
      itemsRef.current = [];
      setItems([]);
      setError(null);
      setLoadingItems(true);
      openRow.current = null;
      const requestId = ++itemsRequestId.current;
      try {
        const data = await checklistApi.items(id);
        if (requestId === itemsRequestId.current) applyItems(id, data.items);
      } catch (e) {
        if (requestId === itemsRequestId.current) setError((e as Error).message);
      } finally {
        if (requestId === itemsRequestId.current) setLoadingItems(false);
      }
    },
    [applyItems],
  );

  /** Re-reads the shown list in place: someone else may have shopped. */
  const reloadItems = useCallback(async () => {
    const id = selectedIdRef.current;
    if (id === null || pendingToggles.current.size > 0) return;
    const requestId = ++itemsRequestId.current;
    try {
      const data = await checklistApi.items(id);
      if (requestId !== itemsRequestId.current || pendingToggles.current.size > 0) return;
      applyItems(id, data.items);
      setError(null);
    } catch (e) {
      if (requestId === itemsRequestId.current) setError((e as Error).message);
    } finally {
      // It may have overtaken a skeleton load of the same list.
      if (requestId === itemsRequestId.current) setLoadingItems(false);
    }
  }, [applyItems]);

  useEffect(() => {
    let active = true;
    checklistApi
      .list()
      .then(({ checklists: available }) => {
        if (!active) return;
        setChecklists(available);
        const initial = defaultChecklistId(available);
        if (initial !== null) void showList(initial);
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoadingLists(false));
    return () => {
      active = false;
    };
  }, [showList]);

  // Back on this screen, or back in the app: the list may have changed in another hand.
  useFocusEffect(
    useCallback(() => {
      void reloadItems();
      const appState = AppState.addEventListener('change', (status) => {
        if (status === 'active') void reloadItems();
      });
      return () => appState.remove();
    }, [reloadItems]),
  );

  const refreshAll = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const { checklists: available } = await checklistApi.list();
      setChecklists(available);
      const current = selectedIdRef.current;
      const target = available.some((checklist) => checklist.id === current) ? current : defaultChecklistId(available);
      if (target === null) {
        selectedIdRef.current = null;
        setSelectedId(null);
        itemsRef.current = [];
        setItems([]);
      } else if (target !== current) {
        await showList(target);
      } else {
        await reloadItems();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const addItem = async () => {
    const listId = selectedIdRef.current;
    if (listId === null || submitting || draft.trim() === '') return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await checklistApi.createItem(listId, draft);
      setDraft('');
      if (selectedIdRef.current === listId) {
        applyItems(listId, [...itemsRef.current.filter((item) => item.id !== created.id), created].sort(byListOrder));
        await reloadItems();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  /** Ticks immediately while the server catches up. A refusal sends it back. */
  const toggleItem = async (item: ChecklistItem) => {
    const listId = selectedIdRef.current;
    if (listId === null || pendingToggles.current.has(item.id) || removingId === item.id) return;
    const completed = !item.completed;
    const withItemAs = (value: boolean) =>
      itemsRef.current
        .map((current) => (current.id === item.id ? { ...current, completed: value } : current))
        .sort(byListOrder);

    pendingToggles.current.add(item.id);
    setError(null);
    openRow.current?.close();
    applyItems(listId, withItemAs(completed));
    try {
      await checklistApi.setCompleted(listId, item.id, completed);
    } catch (e) {
      if (itemsRef.current.some((current) => current.id === item.id)) applyItems(listId, withItemAs(!completed));
      setError((e as Error).message);
    } finally {
      pendingToggles.current.delete(item.id);
    }
    if (pendingToggles.current.size === 0 && selectedIdRef.current === listId) await reloadItems();
  };

  const removeItem = async (itemId: number) => {
    const listId = selectedIdRef.current;
    if (listId === null || removingId !== null) return;
    setRemovingId(itemId);
    setError(null);
    try {
      await checklistApi.removeItem(listId, itemId);
      if (selectedIdRef.current === listId) {
        applyItems(
          listId,
          itemsRef.current.filter((item) => item.id !== itemId),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRemovingId(null);
    }
    if (selectedIdRef.current === listId) await reloadItems();
  };

  const confirmRemove = (item: ChecklistItem) =>
    Dialog.alert(`Remove ${item.name}?`, 'It comes off the list for everyone at home.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove item', style: 'destructive', onPress: () => void removeItem(item.id) },
    ]);

  // Only one row open at a time, as on the web.
  const onRowOpen = (row: SwipeableMethods | null) => {
    if (openRow.current && openRow.current !== row) openRow.current.close();
    openRow.current = row;
  };

  const selected = checklists.find((checklist) => checklist.id === selectedId);
  const outstanding = items.filter((item) => !item.completed);
  const bought = items.filter((item) => item.completed);

  const row = (item: ChecklistItem, index: number) => (
    // One layer while it fades: Android otherwise fades each child alone, and the red swipe action shows through.
    <Animated.View key={item.id} entering={riseIn} exiting={fadeOut} layout={settle} needsOffscreenAlphaCompositing>
      <GroceryRow
        item={item}
        first={index === 0}
        removing={removingId === item.id}
        onToggle={() => void toggleItem(item)}
        onRemove={() => confirmRemove(item)}
        onOpen={onRowOpen}
      />
    </Animated.View>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={theme.accent} colors={[theme.accent]} onRefresh={refreshAll} />
      }>
      <Segments items={HOUSE_SECTIONS} selected={0} />

      <View style={styles.stack}>
        {loadingLists ? (
          <View style={styles.chipSkeletons}>
            {[144, 128, 96].map((width) => (
              <SkeletonBlock key={width} style={{ height: 36, width }} />
            ))}
          </View>
        ) : (
          checklists.length > 0 && (
            <ChipRow scroll accessibilityLabel="Shopping lists">
              {checklists.map((checklist) => {
                const isSelected = checklist.id === selectedId;
                const count = isSelected && !loadingItems ? outstanding.length : checklist.openCount;
                return (
                  <Chip
                    key={checklist.id}
                    selected={isSelected}
                    count={count}
                    onPress={() => checklist.id !== selectedId && void showList(checklist.id)}>
                    {checklist.name}
                  </Chip>
                );
              })}
            </ChipRow>
          )
        )}

        <View style={styles.add}>
          <Input
            value={draft}
            onChangeText={setDraft}
            maxLength={200}
            editable={selectedId !== null}
            accessibilityLabel={`Add an item${selected ? ` to ${selected.name}` : ''}`}
            placeholder={selected ? `Add to ${selected.name}` : 'Add an item'}
            returnKeyType="done"
            // Keeps the keyboard up, so several items go in one after another.
            submitBehavior="submit"
            onSubmitEditing={() => void addItem()}
            style={styles.flex}
          />
          <Button
            variant="primary"
            disabled={selectedId === null || draft.trim() === ''}
            loading={submitting}
            onPress={() => void addItem()}
            style={styles.addButton}>
            Add
          </Button>
        </View>

        {error && (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loadingItems ? (
          <View
            accessibilityLabel="Loading checklist items"
            style={[styles.panel, { backgroundColor: theme.surface, boxShadow: theme.shadowE1 }]}>
            {[0, 1, 2, 3, 4].map((key) => (
              <View key={key} style={[styles.skeletonRow, key > 0 && { borderTopWidth: 1, borderColor: theme.hairline }]}>
                <SkeletonBlock style={{ width: 24, height: 24 }} />
                <View style={styles.skeletonText}>
                  <SkeletonBlock style={{ height: 14, width: '50%' }} />
                  <SkeletonBlock style={{ height: 10, width: '33%' }} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          selectedId !== null && (
            <>
              <Animated.View
                layout={settle}
                accessibilityLabel="To buy"
                style={[styles.panel, { backgroundColor: theme.surface, boxShadow: theme.shadowE1 }]}>
                {outstanding.map(row)}
                {outstanding.length === 0 && (
                  <Animated.View entering={riseIn} exiting={fadeOut}>
                    <ThemedText type="sm" themeColor="fgMuted" style={styles.empty}>
                      Nothing left to buy here.
                    </ThemedText>
                  </Animated.View>
                )}
              </Animated.View>

              {/* Bought stays on the page rather than vanishing: it is what you
                  check against at the till, and a mis-tap is one tap to undo. */}
              {bought.length > 0 && (
                <Animated.View
                  entering={riseIn}
                  exiting={fadeOut}
                  layout={settle}
                  accessibilityLabel="Bought"
                  style={styles.bought}>
                  <ThemedText type="eyebrow" themeColor="fgMuted" accessibilityRole="header" style={styles.eyebrow}>
                    Bought · {bought.length}
                  </ThemedText>
                  <Animated.View layout={settle} style={[styles.panel, { backgroundColor: theme.surfaceDim }]}>
                    {bought.map(row)}
                  </Animated.View>
                </Animated.View>
              )}
            </>
          )
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Gutter, paddingBottom: 40 },
  stack: { gap: 14 },
  chipSkeletons: { flexDirection: 'row', gap: 8 },
  add: { flexDirection: 'row', gap: 8 },
  addButton: { height: 48, borderRadius: Radius.field, paddingHorizontal: 18 },
  panel: { borderRadius: Radius.panel, paddingVertical: 4, overflow: 'hidden' },
  empty: { textAlign: 'center', paddingHorizontal: 16, paddingVertical: 20 },
  bought: { gap: 6, marginTop: 6 },
  eyebrow: { paddingHorizontal: 4 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, marginHorizontal: 16 },
  skeletonText: { flex: 1, gap: 8 },
});
