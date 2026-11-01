import { SymbolView } from 'expo-symbols';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { BillList, openBill } from '@/components/bill-list';
import { Segments } from '@/components/segments';
import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { growUp, riseIn } from '@/components/ui/motion';
import { Pressable } from '@/components/ui/pressable';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Icons } from '@/constants/icons';
import { ACTIVITY_SECTIONS } from '@/constants/sections';
import { Gutter, Radius } from '@/constants/theme';
import { useEnergy } from '@/hooks/use-energy';
import { useTheme } from '@/hooks/use-theme';
import {
  BAND,
  band,
  billDays,
  billKwh,
  newestFirst,
  type CostMonth,
  type CostSummary,
  type EnergyBill,
  type RuntimeProfile,
} from '@/lib/energy';
import { axis, hourTick, money, monthName, wholeNumber, windowLabel } from '@/lib/energy-format';

/** The monthly chart's plot height, in px. */
const PLOT = 160;
/** The tallest runtime bar, in px. */
const RUNTIME = 120;

const billLine = (bill: EnergyBill) => `${billDays(bill)} days · ${wholeNumber(billKwh(bill))} kWh`;

/** Activity · Costs, ported from the web's `ActivityCosts.tsx`: monthly cost from bills, a forecast, and when the aircon runs. */
export default function CostsScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useEnergy({ poll: true });
  const summary = data?.summary ?? null;
  const bills = newestFirst(data?.bills ?? []);
  const stale = !!data && !!summary && (Date.parse(data.asOf) - Date.parse(summary.endDate)) / 86_400_000 > 90;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} tintColor={theme.accent} colors={[theme.accent]} onRefresh={reload} />}>
      <Segments items={ACTIVITY_SECTIONS} selected={2} />

      <View style={styles.stack}>
        {error && (
          <Alert onRetry={() => void reload()}>{data ? `Showing the last loaded figures. ${error}` : error}</Alert>
        )}

        {loading && !data ? (
          <View accessibilityLabel="Loading energy costs" style={styles.stack}>
            <SkeletonBlock style={{ height: 288, borderRadius: Radius.tile }} />
            <View style={styles.tiles}>
              {[0, 1, 2].map((index) => (
                <SkeletonBlock key={index} style={{ flex: 1, height: 80, borderRadius: Radius.card }} />
              ))}
            </View>
            <SkeletonBlock style={{ height: 224, borderRadius: Radius.tile }} />
          </View>
        ) : data && !summary ? (
          <Card level="panel">
            <EmptyState
              icon={Icons.receipt}
              title="Your costs start with a bill"
              body="Add an electricity bill to see monthly costs and a forecast from your actual tariff. Nothing here is made up."
              action={
                <Button variant="primary" icon={Icons.plus} onPress={() => openBill('new')}>
                  Add your first bill
                </Button>
              }
            />
          </Card>
        ) : null}

        {data && summary && (
          <Animated.View entering={riseIn} style={styles.stack}>
            {stale && (
              <Alert tone="warning">
                Your latest bill ended more than 90 days ago. Add a recent one to keep the tariff and daily average
                current.
              </Alert>
            )}

            <MonthlyChart summary={summary} />

            <View accessibilityLabel="Summary" style={styles.tiles}>
              <Tile
                label="Average month"
                value={summary.averageMonthCents === null ? '—' : money(summary.averageMonthCents, 0)}
              />
              <Tile label="Per day" value={money(summary.dailyCents)} />
              <Tile label="Busiest window" value={busiestWindow(data.runtime)} />
            </View>

            <RuntimeChart profile={data.runtime} />

            <View style={styles.section}>
              <View style={styles.billsHead}>
                <ThemedText accessibilityRole="header" style={styles.heading}>
                  Bills
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openBill('new')}
                  style={({ pressed }) => [styles.addBill, pressed && styles.pressed]}>
                  <SymbolView name={Icons.plus} size={16} tintColor={theme.accent} />
                  <ThemedText type="body" themeColor="accent" style={styles.semibold}>
                    Add bill
                  </ThemedText>
                </Pressable>
              </View>
              <BillList bills={bills} subtitle={billLine} />
            </View>

            <ThemedText type="meta" themeColor="fgMuted" style={styles.footnote}>
              Forecasts assume you keep using about {summary.dailyKwh.toFixed(1)} kWh a day at your latest tariff. Fees
              and credits are left out, and nothing is filled in before or between bills.
            </ThemedText>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

function busiestWindow(profile: RuntimeProfile): string {
  if (!profile.totalSeconds) return '—';
  const top = [...profile.buckets].sort((a, b) => b.seconds - a.seconds)[0]!;
  return windowLabel(top.hour);
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card level="row" padding="none" accessible accessibilityLabel={`${label}, ${value}`} style={styles.tile}>
      <ThemedText type="xs" themeColor="fgMuted" style={styles.medium}>
        {label}
      </ThemedText>
      {/* A phone's third of the width is narrower than the web's tile: `9 pm–12 am` shrinks to fit. */}
      <ThemedText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.tileValue, value.length > 7 && styles.tileValueLong]}>
        {value}
      </ThemedText>
    </Card>
  );
}

function MonthlyChart({ summary }: { summary: CostSummary }) {
  const theme = useTheme();
  // A bridge still running a build from before `year` existed only sends the
  // four recent months; chart those rather than nothing.
  const months = summary.year ?? summary.months;
  const year = summary.currentMonth.slice(0, 4);
  const current = months.find((month) => month.month === summary.currentMonth);
  const { ticks, top } = axis(Math.max(1, ...months.map((month) => band(month).high)));
  const px = (cents: number) => (cents / top) * PLOT;
  const hasForecast = months.some((month) => month.estimatedDays > 0);
  const covered = (month: CostMonth) => month.billedDays + month.estimatedDays > 0;

  const describe = (list: CostMonth[]) =>
    list.map((month) => `${monthName(month.month)} ${money(month.totalCents, 0)}`).join(', ');
  const billed = months.filter((month) => covered(month) && month.estimatedDays === 0);
  const forecast = months.filter((month) => month.estimatedDays > 0);
  const label = [
    `Monthly electricity cost for ${year}.`,
    billed.length ? `From bills: ${describe(billed)}.` : '',
    forecast.length ? `Forecast: ${describe(forecast)}, each give or take ${BAND * 100}% on the estimated part.` : '',
    months.some((month) => !covered(month)) ? 'Months with no bill are left empty.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Card level="tile" padding="none" style={styles.chartCard}>
      <ThemedText accessibilityRole="header" style={styles.heading}>
        Monthly electricity · {year}
      </ThemedText>

      <View style={styles.legend}>
        <Legend swatch={{ backgroundColor: theme.accent }}>From bills</Legend>
        {hasForecast && (
          <>
            <Legend swatch={[styles.dashed, { borderColor: theme.accent, backgroundColor: theme.surface }]}>Forecast</Legend>
            <Legend swatch={{ backgroundColor: theme.chartBand }}>{`±${BAND * 100}% range`}</Legend>
          </>
        )}
      </View>

      <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.plotRow}>
        <View style={styles.yAxis}>
          {ticks.map((tick) => (
            <ThemedText key={tick} themeColor="fgMuted" style={[styles.tick, styles.yTick, { bottom: px(tick) - 8 }]}>
              {money(tick, 0)}
            </ThemedText>
          ))}
        </View>

        <View style={styles.plotColumn}>
          <View style={[styles.plot, { borderColor: theme.border }]}>
            {ticks.slice(1).map((tick) => (
              <View key={tick} style={[styles.gridline, { bottom: px(tick), borderColor: theme.hairline }]} />
            ))}
            <View style={styles.columns}>
              {months.map((month, index) => {
                const { low, high } = band(month);
                const estimated = month.estimatedDays > 0;
                const shown = covered(month) && month.totalCents > 0;
                return (
                  <View key={month.month} style={styles.column}>
                    {estimated && (
                      <View
                        style={[styles.band, { bottom: px(low), height: px(high - low), backgroundColor: theme.chartBand }]}
                      />
                    )}
                    {shown && (
                      <Animated.View
                        style={[
                          styles.bar,
                          growUp,
                          { height: px(month.totalCents), animationDelay: index * 30 },
                          estimated
                            ? [styles.dashed, { borderColor: theme.accent, backgroundColor: theme.surface }]
                            : { backgroundColor: theme.accent },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.monthLabels}>
            {months.map((month) => {
              const now = month.month === summary.currentMonth;
              return (
                <ThemedText
                  key={month.month}
                  themeColor={now ? 'fg' : 'fgMuted'}
                  style={[styles.tick, styles.monthLabel, now && styles.bold]}>
                  {monthName(month.month, 'narrow')}
                </ThemedText>
              );
            })}
          </View>
        </View>
      </View>

      <MonthSentence current={current} december={months.find((month) => month.month === `${year}-12`)} />
    </Card>
  );
}

function Legend({ swatch, children }: { swatch: StyleProp<ViewStyle>; children: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, swatch]} />
      <ThemedText type="xs" themeColor="fgMuted">
        {children}
      </ThemedText>
    </View>
  );
}

/** `October looks like about $165 (between $152 and $178). December forecast: $268.` */
function MonthSentence({ current, december }: { current: CostMonth | undefined; december: CostMonth | undefined }) {
  if (!current) return null;
  const name = monthName(current.month, 'long');
  const { low, high } = band(current);
  const decemberForecast =
    december && december.month !== current.month && december.estimatedDays > 0 && december.missingDays === 0;
  const strong = (cents: number) => (
    <ThemedText type="meta" style={styles.semibold}>
      {money(cents, 0)}
    </ThemedText>
  );

  return (
    <ThemedText type="meta" themeColor="fgBody">
      {current.missingDays > 0 ? (
        `Your bills don't cover all of ${name} yet, so there's no full-month figure.`
      ) : current.estimatedDays > 0 ? (
        <>
          {name} looks like about {strong(current.totalCents)} (between {money(low, 0)} and {money(high, 0)}).
        </>
      ) : (
        <>
          {name} came to {strong(current.totalCents)}, all from bills.
        </>
      )}
      {decemberForecast && <> December forecast: {strong(december.totalCents)}.</>}
    </ThemedText>
  );
}

function RuntimeChart({ profile }: { profile: RuntimeProfile }) {
  const theme = useTheme();
  const hours = profile.buckets.map((bucket) => ({ hour: bucket.hour, value: bucket.seconds / 3600 }));
  const max = Math.max(...hours.map((bucket) => bucket.value));
  const busiest = hours.find((bucket) => bucket.value === max && max > 0);
  const label = `Hours of runtime by three-hour window over the last 30 days: ${hours
    .map((bucket) => `${windowLabel(bucket.hour)} ${bucket.value.toFixed(1)} hours`)
    .join(', ')}.${busiest ? ` Busiest is ${windowLabel(busiest.hour)}.` : ''}`;

  return (
    <Card level="tile" padding="none" style={[styles.chartCard, styles.runtimeCard]}>
      <View style={styles.titleBlock}>
        <ThemedText accessibilityRole="header" style={styles.heading}>
          When the aircon runs
        </ThemedText>
        <ThemedText type="meta" themeColor="fgMuted">
          Hours of runtime per 3-hour window, last 30 days
        </ThemedText>
      </View>

      {profile.totalSeconds === 0 ? (
        <ThemedText type="meta" themeColor="fgMuted">
          No runtime recorded in the last 30 days. This fills in as the bridge sees rooms running.
        </ThemedText>
      ) : (
        <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.hours}>
          {hours.map((bucket, index) => {
            const top = bucket === busiest;
            return (
              <View key={bucket.hour} style={styles.hour}>
                <ThemedText style={[styles.tick, styles.semibold, { color: top ? theme.chartHot : theme.fgMuted }]}>
                  {bucket.value.toFixed(1)}
                </ThemedText>
                <Animated.View
                  style={[
                    styles.hourBar,
                    growUp,
                    {
                      height: Math.max(4, Math.round((bucket.value / max) * RUNTIME)),
                      backgroundColor: top ? theme.chartHot : theme.accentMuted,
                      animationDelay: index * 30,
                    },
                  ]}
                />
                <ThemedText numberOfLines={1} themeColor="fgMuted" style={styles.tick}>
                  {hourTick(bucket.hour)}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  content: { padding: Gutter, paddingBottom: 40 },
  stack: { gap: 14 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, minWidth: 0, gap: 4, paddingHorizontal: 12, paddingVertical: 14 },
  tileValue: { fontSize: 24, lineHeight: 32, fontWeight: '500', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  tileValueLong: { fontSize: 18 },
  section: { gap: 8 },
  billsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4 },
  addBill: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 4, marginRight: -4 },
  pressed: { opacity: 0.6 },
  footnote: { paddingHorizontal: 4 },
  chartCard: { gap: 12, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
  runtimeCard: { gap: 14 },
  titleBlock: { gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed' },
  plotRow: { flexDirection: 'row', gap: 6, paddingTop: 6 },
  yAxis: { width: 36, height: PLOT },
  tick: { fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] },
  yTick: { position: 'absolute', right: 0 },
  plotColumn: { flex: 1, minWidth: 0, gap: 6 },
  plot: { height: PLOT, borderBottomWidth: 1 },
  gridline: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1 },
  columns: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  band: { position: 'absolute', left: -2, right: -2, borderRadius: 3 },
  bar: { borderTopLeftRadius: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  monthLabels: { flexDirection: 'row', gap: 4 },
  monthLabel: { flex: 1, textAlign: 'center' },
  hours: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  hour: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
  hourBar: {
    alignSelf: 'stretch',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});
