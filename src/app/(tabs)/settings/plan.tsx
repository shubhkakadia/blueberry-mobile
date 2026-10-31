import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { BillList, openBill } from '@/components/bill-list';
import { Segments } from '@/components/segments';
import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Icons } from '@/constants/icons';
import { SETTINGS_SECTIONS } from '@/constants/sections';
import { Gutter, Radius } from '@/constants/theme';
import { useEnergy } from '@/hooks/use-energy';
import { useTheme } from '@/hooks/use-theme';
import { billSummary, newestFirst } from '@/lib/energy';
import { billDate, centsFigure, rateCents } from '@/lib/energy-format';

/** Settings · Energy plan, ported from the web's `SettingsPlan.tsx`: the tariff on file and the bills behind it. */
export default function PlanScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useEnergy();
  const bills = newestFirst(data?.bills ?? []);
  const latest = bills.find((bill) => bill.id === data?.summary?.billId) ?? bills[0];
  // Periods run oldest to newest, so the last one is what you are paying now.
  const current = latest && [...latest.periods].sort((a, b) => a.startDate.localeCompare(b.startDate)).at(-1)!;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} tintColor={theme.accent} colors={[theme.accent]} onRefresh={reload} />}>
      <Segments items={SETTINGS_SECTIONS} selected={1} />

      {loading && !data ? (
        <View accessibilityLabel="Loading your energy plan" style={styles.stack}>
          <SkeletonBlock style={{ height: 208, borderRadius: Radius.tile }} />
          <SkeletonBlock style={{ height: 256, borderRadius: Radius.panel }} />
        </View>
      ) : !latest || !current ? (
        <View style={styles.stack}>
          {error && <Alert onRetry={() => void reload()}>{error}</Alert>}
          <Card level="tile">
            <EmptyState
              icon={Icons.receipt}
              title="No bill on file"
              body="Add an electricity bill and your retailer and rates appear here — read from the invoice, not estimated."
              action={
                <Button variant="primary" icon={Icons.plus} onPress={() => openBill('new')}>
                  Add your first bill
                </Button>
              }
            />
          </Card>
        </View>
      ) : (
        <View style={styles.stack}>
          {error && <Alert onRetry={() => void reload()}>Showing the last loaded data. {error}</Alert>}

          <Card level="tile" padding="lg" accessibilityLabel="Retailer" style={styles.retailer}>
            <View style={styles.retailerTop}>
              <View style={styles.flex}>
                <ThemedText style={[styles.caps, { color: theme.fgMuted }]}>Retailer</ThemedText>
                <ThemedText style={styles.retailerName}>{latest.retailer}</ThemedText>
                {latest.planName !== '' && (
                  <ThemedText type="sm" themeColor="fgBody">
                    {latest.planName}
                  </ThemedText>
                )}
              </View>
              <Button accessibilityLabel="Edit latest bill" onPress={() => openBill(latest.id)}>
                Edit
              </Button>
            </View>
            <View style={styles.rates}>
              <RateTile label="Usage rate" cents={rateCents(current.usageRate)} unit="c/kWh" />
              <RateTile label="Daily supply" cents={rateCents(current.supplyRate)} unit="c/day" />
            </View>
            <ThemedText type="meta" themeColor="fgMuted">
              Current since {billDate(current.startDate, true)}, taken from your latest bill.
            </ThemedText>
          </Card>

          <View style={styles.section}>
            <View style={styles.header}>
              <ThemedText type="eyebrow" themeColor="fgMuted" accessibilityRole="header">
                Bills
              </ThemedText>
              <ThemedText type="meta" themeColor="fgMuted">
                Used to work out Costs
              </ThemedText>
            </View>
            <BillList bills={bills} subtitle={billSummary} />
            <Button variant="primary" size="lg" fullWidth icon={Icons.plus} onPress={() => openBill('new')} style={styles.add}>
              Add a bill
            </Button>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function RateTile({ label, cents, unit }: { label: string; cents: number; unit: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surfaceInset }]}>
      <ThemedText type="xs" themeColor="fgMuted" style={styles.medium}>
        {label}
      </ThemedText>
      <ThemedText style={styles.rate}>
        {centsFigure(cents)}
        <ThemedText type="meta" themeColor="fgMuted" style={styles.medium}>
          {` ${unit}`}
        </ThemedText>
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 3 },
  medium: { fontWeight: '500' },
  content: { padding: Gutter, paddingBottom: 40 },
  stack: { gap: 20 },
  retailer: { gap: 16 },
  retailerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  caps: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  retailerName: { fontSize: 22, lineHeight: 27, fontWeight: '600', letterSpacing: -0.4 },
  rates: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, gap: 4, padding: 14, borderRadius: Radius.row },
  rate: { fontSize: 26, lineHeight: 32, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  section: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  add: { marginTop: 6 },
});
