import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { DayCard } from '@/components/day-card';
import { DinnerViews } from '@/components/dinner-views';
import { Segments } from '@/components/segments';
import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { IconButton } from '@/components/ui/button';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Icons } from '@/constants/icons';
import { HOUSE_SECTIONS } from '@/constants/sections';
import { Gutter, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  dineApi,
  formatWeekRange,
  todayInZone,
  weekLabel,
  type DinnerDay,
  type DinnerWeek,
  type Dish,
} from '@/lib/dine';

/** House · Dinner · This week, ported from the web's `DineMenu.tsx`. */
export default function DinnerWeekScreen() {
  const theme = useTheme();
  const [week, setWeek] = useState<DinnerWeek | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  // Another week is on its way. The current one stays up, dimmed - a skeleton
  // between weeks is just a flash.
  const [paging, setPaging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyDay, setBusyDay] = useState<number | null>(null);
  // Keyed by week and day, so paging never carries a draft across.
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const requestId = useRef(0);
  // The Monday asked for; undefined asks the server for the current week.
  const shownWeek = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const [weekData, dishData] = await Promise.all([dineApi.week(shownWeek.current), dineApi.dishes()]);
      if (id !== requestId.current) return;
      setWeek(weekData);
      setDishes(dishData.dishes);
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setPaging(false);
      }
    }
  }, []);

  // Housemates edit this at the same time - and the dish library may have
  // changed - so re-read on coming back to the screen or to the app.
  useFocusEffect(
    useCallback(() => {
      void load();
      const appState = AppState.addEventListener('change', (status) => {
        if (status === 'active') void load();
      });
      return () => appState.remove();
    }, [load]),
  );

  const goToWeek = (target: string | undefined) => {
    // The same week again would never load, leaving the page dimmed.
    if (target === shownWeek.current) return;
    shownWeek.current = target;
    setPaging(true);
    void load();
  };

  const applyDay = (updated: DinnerDay) =>
    setWeek((current) =>
      current
        ? { ...current, days: current.days.map((day) => (day.dayOffset === updated.dayOffset ? updated : day)) }
        : current,
    );

  const changeDish = async (dayOffset: number, dishId: number | null) => {
    if (!week || busyDay !== null) return;
    setBusyDay(dayOffset);
    setError(null);
    try {
      applyDay(await dineApi.setDayDish(week.weekStartDate, dayOffset, dishId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyDay(null);
    }
  };

  const saveNotes = async (day: DinnerDay) => {
    if (!week) return;
    const key = `${week.weekStartDate}:${day.dayOffset}`;
    const draft = noteDrafts[key];
    if (draft === undefined || draft === (day.notes ?? '')) return;
    setBusyDay(day.dayOffset);
    setError(null);
    try {
      applyDay(await dineApi.setDayNotes(week.weekStartDate, day.dayOffset, draft));
      setNoteDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyDay(null);
    }
  };

  const today = week ? todayInZone(week.timeZone) : null;
  const isCurrentWeek = week ? week.nextWeekStart === null : false;
  const navLocked = busyDay !== null || paging;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.accent}
            colors={[theme.accent]}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }>
        <Segments items={HOUSE_SECTIONS} selected={1} />

        <View style={styles.stack}>
          <DinnerViews view="week" />

          {error && (
            <Alert tone="danger" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading || !week ? (
            <View accessibilityLabel="Loading the weekly menu" style={styles.stack}>
              <View style={styles.weekNav}>
                <SkeletonBlock style={styles.round} />
                <SkeletonBlock style={{ height: 20, width: 112 }} />
                <SkeletonBlock style={styles.round} />
              </View>
              {[0, 1, 2, 3].map((key) => (
                <SkeletonBlock key={key} style={{ height: 112, borderRadius: Radius.card }} />
              ))}
            </View>
          ) : (
            <>
              <View style={styles.weekNav}>
                <IconButton
                  icon={Icons.chevronLeft}
                  label="Previous week"
                  variant="secondary"
                  shape="round"
                  disabled={navLocked}
                  onPress={() => goToWeek(week.previousWeekStart)}
                />
                {/* The label doubles as the way back to this week, so there is no separate button for it. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint={isCurrentWeek ? undefined : 'Goes back to this week'}
                  disabled={isCurrentWeek || navLocked}
                  onPress={() => goToWeek(undefined)}
                  style={styles.weekLabel}>
                  <ThemedText numberOfLines={1} style={styles.range}>
                    {formatWeekRange(week.days)}
                  </ThemedText>
                  <ThemedText type="xs" themeColor="fgMuted" numberOfLines={1} style={styles.medium}>
                    {weekLabel(week)}
                  </ThemedText>
                </Pressable>
                <IconButton
                  icon={Icons.chevronRight}
                  label="Next week"
                  variant="secondary"
                  shape="round"
                  disabled={week.nextWeekStart === null || navLocked}
                  onPress={() => week.nextWeekStart && goToWeek(week.nextWeekStart)}
                />
              </View>

              <View style={[styles.stack, paging && styles.paging]}>
                {week.days.map((day) => {
                  const key = `${week.weekStartDate}:${day.dayOffset}`;
                  return (
                    <DayCard
                      key={key}
                      day={day}
                      dishes={dishes}
                      isToday={day.date === today}
                      busy={busyDay === day.dayOffset}
                      disabled={navLocked}
                      noteDraft={noteDrafts[key]}
                      onDishChange={(dishId) => void changeDish(day.dayOffset, dishId)}
                      onNoteDraft={(value) => setNoteDrafts((current) => ({ ...current, [key]: value }))}
                      onNoteCommit={() => void saveNotes(day)}
                    />
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  medium: { fontWeight: '500' },
  content: { padding: Gutter, paddingBottom: 40 },
  stack: { gap: 12 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  round: { width: 44, height: 44 },
  weekLabel: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 8 },
  range: { fontSize: 18, lineHeight: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  paging: { opacity: 0.6 },
});
