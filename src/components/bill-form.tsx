import { SymbolView } from 'expo-symbols';
import { router, Stack } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  Alert as Dialog,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type KeyboardTypeOptions,
  type ScrollViewInstance,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/time-field';
import { Alert } from '@/components/ui/alert';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { easeChanges, fadeOut, riseIn, settle } from '@/components/ui/motion';
import { Icons } from '@/constants/icons';
import { Gutter, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { energyApi, type EnergyBill, type EnergyBillInput } from '@/lib/energy';
import {
  dollars,
  draftFrom,
  emptyPeriod,
  money,
  nextDay,
  num,
  reconcile,
  toDollars,
  type PeriodDraft,
} from '@/lib/energy-format';

const UNSIGNED: KeyboardTypeOptions = 'decimal-pad';
// iOS's decimal pad has no minus key; Android's numeric pad does.
const SIGNED: KeyboardTypeOptions = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

/** A period on screen. The id keeps each card's fields with it as rows above are removed. */
type PeriodRow = PeriodDraft & { id: number };
let nextRowId = 0;
const withId = (period: PeriodDraft): PeriodRow => ({ ...period, id: ++nextRowId });

/**
 * Add or edit an electricity bill, ported from the web's `EnergyBillForm`. It
 * saves only when the typed bill adds up exactly to the invoice, then closes.
 */
export function BillForm({ bill, today }: { bill: EnergyBill | null; today: string }) {
  const theme = useTheme();
  const [initial] = useState(() => draftFrom(bill));
  const [amountDue, setAmountDue] = useState(bill ? dollars(bill.amountDueCents) : '');
  const [retailer, setRetailer] = useState(bill?.retailer ?? '');
  const [planName, setPlanName] = useState(bill?.planName ?? '');
  const [issuedDate, setIssuedDate] = useState(bill?.issuedDate ?? today);
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? '');
  const [nextReadStart, setNextReadStart] = useState(bill?.nextReadStart ?? '');
  const [nextReadEnd, setNextReadEnd] = useState(bill?.nextReadEnd ?? '');
  const [periods, setPeriods] = useState<PeriodRow[]>(() => initial.periods.map(withId));
  const [discountPercent, setDiscountPercent] = useState(String(bill?.discountPercent ?? 0));
  const [discountScope, setDiscountScope] = useState<EnergyBillInput['discountScope']>(
    bill?.discountScope ?? 'usage_supply',
  );
  const [discount, setDiscount] = useState(bill ? dollars(bill.discountCents) : '');
  const [adjustments, setAdjustments] = useState(initial.adjustments);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollViewInstance>(null);

  const totals = reconcile({ periods, discountPercent, discountScope, discount, adjustments, amountDue });
  const { amounts, balanced, hasInvoice, difference } = totals;

  const updatePeriod = (id: number, key: keyof PeriodDraft, value: string) =>
    setPeriods((current) => current.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  // A new period starts the day after the last one ends: the server requires
  // them consecutive, and this is the only value that can be.
  const addPeriod = () => setPeriods((current) => [...current, withId(emptyPeriod(nextDay(current.at(-1)?.endDate ?? '')))]);

  const fail = (failure: unknown, fallback: string) => {
    setError(failure instanceof Error ? failure.message : fallback);
    scroller.current?.scrollTo({ y: 0 });
  };

  const save = async () => {
    if (!balanced || busy) return;
    setBusy(true);
    setError(null);
    try {
      await energyApi.save(
        {
          retailer,
          planName,
          issuedDate,
          dueDate,
          nextReadStart: nextReadStart || null,
          nextReadEnd: nextReadEnd || null,
          discountPercent: num(discountPercent),
          discountScope,
          discountCents: totals.discountCents,
          adjustmentsCents: totals.adjustmentsCents,
          amountDueCents: totals.invoiceCents,
          periods: periods.map((p, i) => ({
            startDate: p.startDate,
            endDate: p.endDate,
            kwh: num(p.kwh),
            usageRate: toDollars(p.usageRate),
            supplyRate: toDollars(p.supplyRate),
            usageCents: amounts[i]!.usageCents,
            supplyCents: amounts[i]!.supplyCents,
          })),
        },
        bill?.id,
      );
      router.back();
    } catch (failure) {
      fail(failure, 'The bill could not be saved.');
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!bill) return;
    Dialog.alert('Delete this bill?', 'Its rate periods go with it, and Costs is worked out again without it.', [
      { text: 'Keep bill', style: 'cancel' },
      {
        text: 'Delete bill',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            await energyApi.remove(bill.id);
            router.back();
          } catch (failure) {
            fail(failure, 'The bill could not be deleted.');
            setBusy(false);
          }
        },
      },
    ]);
  };

  const message = balanced
    ? 'Adds up exactly to the invoice'
    : !hasInvoice
      ? 'Enter the invoice total to check the bill adds up'
      : `${money(Math.abs(difference))} ${difference > 0 ? 'short of' : 'over'} the invoice — it has to match to save`;
  const check = balanced
    ? { bg: theme.positiveSoft, ink: theme.positiveInk }
    : hasInvoice
      ? { bg: theme.dangerSoft, ink: theme.dangerInk }
      : { bg: theme.surfaceInset, ink: theme.fgBody };

  return (
    <>
      <Stack.Screen
        options={{
          title: bill ? 'Edit bill' : 'Add bill',
          headerLeft: () => (
            <Button variant="ghost" size="sm" onPress={() => router.back()}>
              Cancel
            </Button>
          ),
          headerRight: () => (
            <Button variant="primary" size="sm" pill disabled={!balanced} loading={busy} onPress={save}>
              Save
            </Button>
          ),
        }}
      />
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {error && <Alert tone="danger">{error}</Alert>}

          <Card level="tile" padding="lg" accessibilityLabel="Invoice" style={styles.card}>
            <Field label="Invoice total">
              {(a11y) => (
                <View>
                  <Input
                    {...a11y}
                    keyboardType={SIGNED}
                    autoComplete="off"
                    placeholder="0.00"
                    value={amountDue}
                    onChangeText={setAmountDue}
                    style={styles.total}
                  />
                  <ThemedText themeColor="fgMuted" style={styles.dollar}>
                    $
                  </ThemedText>
                </View>
              )}
            </Field>
            <View style={styles.pair}>
              <Field label="Retailer" style={styles.fill}>
                {(a11y) => (
                  <Input {...a11y} fieldSize="md" maxLength={120} autoComplete="off" value={retailer} onChangeText={setRetailer} />
                )}
              </Field>
              <Field label="Plan name" style={styles.fill}>
                {(a11y) => (
                  <Input
                    {...a11y}
                    fieldSize="md"
                    maxLength={120}
                    autoComplete="off"
                    placeholder="Optional"
                    value={planName}
                    onChangeText={setPlanName}
                  />
                )}
              </Field>
            </View>
            <View style={styles.pair}>
              <DateField label="Issued on" value={issuedDate} onChange={setIssuedDate} maximum={today} />
              <DateField label="Due on" value={dueDate} onChange={setDueDate} minimum={issuedDate || undefined} />
            </View>
          </Card>

          <Section title="Rate periods" subtitle="Add one for each price change on the bill.">
            {periods.map((period, index) => (
              <PeriodCard
                key={period.id}
                number={index + 1}
                period={period}
                amounts={amounts[index]!}
                removable={periods.length > 1}
                onChange={(key, value) => updatePeriod(period.id, key, value)}
                onRemove={() => setPeriods((current) => current.filter((p) => p.id !== period.id))}
              />
            ))}
            <Button variant="dashed" size="lg" icon={Icons.plus} disabled={periods.length >= 24} onPress={addPeriod}>
              Add rate period
            </Button>
          </Section>

          <Section title="Discounts & adjustments" subtitle="The discount is taken off; use a minus sign for credits.">
            <Card level="tile" padding="none" style={styles.list}>
              <View style={[styles.discounts, { borderColor: theme.hairline }]}>
                <View style={styles.pair}>
                  <Field label="Discount %" size="sm" style={styles.narrow}>
                    {(a11y) => (
                      <Input
                        {...a11y}
                        fieldSize="md"
                        keyboardType={UNSIGNED}
                        value={discountPercent}
                        onChangeText={setDiscountPercent}
                        style={styles.number}
                      />
                    )}
                  </Field>
                  <Field label="Amount" size="sm" style={styles.fill}>
                    {(a11y) => (
                      <Input
                        {...a11y}
                        fieldSize="md"
                        keyboardType={UNSIGNED}
                        placeholder={dollars(totals.computedDiscount)}
                        value={discount}
                        onChangeText={setDiscount}
                        style={[styles.number, styles.right]}
                      />
                    )}
                  </Field>
                </View>
                <Field label="Applies to" size="sm">
                  <ChipRow accessibilityLabel="Discount applies to">
                    <Chip selected={discountScope === 'usage_supply'} onPress={() => setDiscountScope('usage_supply')}>
                      All charges
                    </Chip>
                    <Chip selected={discountScope === 'usage'} onPress={() => setDiscountScope('usage')}>
                      Usage only
                    </Chip>
                  </ChipRow>
                </Field>
              </View>
              <View style={styles.adjustments}>
                <View style={styles.fill}>
                  <ThemedText type="body" style={styles.medium}>
                    Fees, balance & credits
                  </ThemedText>
                  <ThemedText type="xs" themeColor="fgMuted">
                    {initial.carried !== 0
                      ? `Includes ${money(initial.carried)} of rounding from the saved charges.`
                      : 'Late fees or a carried balance.'}
                  </ThemedText>
                </View>
                <Input
                  accessibilityLabel="Fees, balance and credits"
                  fieldSize="md"
                  keyboardType={SIGNED}
                  value={adjustments}
                  onChangeText={setAdjustments}
                  style={[styles.adjustment, styles.number, styles.right]}
                />
              </View>
            </Card>
            {discount.trim() === '' && totals.computedDiscount > 0 && (
              <ThemedText type="xs" themeColor="fgMuted" style={styles.note}>
                A blank amount uses {money(totals.computedDiscount)}, {num(discountPercent)}% of the{' '}
                {discountScope === 'usage' ? 'usage' : 'usage and supply'} charges.
              </ThemedText>
            )}
          </Section>

          <Section
            title="Next meter read"
            subtitle="Optional — the read window printed on the invoice."
            action={
              (nextReadStart || nextReadEnd) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setNextReadStart('');
                    setNextReadEnd('');
                  }}>
                  Clear
                </Button>
              )
            }>
            <Card level="tile" padding="md" style={styles.pair}>
              <DateField label="From" size="sm" value={nextReadStart} onChange={setNextReadStart} />
              <DateField
                label="To"
                size="sm"
                value={nextReadEnd}
                onChange={setNextReadEnd}
                minimum={nextReadStart || undefined}
              />
            </Card>
          </Section>

          <Animated.View accessibilityLabel="Check total" style={[styles.check, easeChanges, { backgroundColor: check.bg }]}>
            <TotalLine label="Rate periods" value={money(totals.gross)} color={check.ink} />
            <TotalLine
              label="Discounts & adjustments"
              value={money(totals.adjustmentsCents - totals.discountCents)}
              color={check.ink}
            />
            <TotalLine label="Calculated" value={money(totals.calculated)} color={check.ink} strong />
            <TotalLine label="Invoice" value={hasInvoice ? money(totals.invoiceCents) : '—'} color={check.ink} />
            <View accessibilityLiveRegion="polite" style={styles.status}>
              <SymbolView name={balanced ? Icons.checkCircle : Icons.warning} size={22} tintColor={check.ink} />
              <ThemedText type="body" style={[styles.flexText, styles.semibold, { color: check.ink }]}>
                {message}
              </ThemedText>
            </View>
          </Animated.View>

          {bill && (
            <Button variant="danger" size="lg" icon={Icons.trash} fullWidth disabled={busy} onPress={confirmDelete}>
              Delete bill
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.fill}>
          <ThemedText accessibilityRole="header" style={styles.sectionTitle}>
            {title}
          </ThemedText>
          <ThemedText type="meta" themeColor="fgMuted">
            {subtitle}
          </ThemedText>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

function TotalLine({ label, value, color, strong = false }: { label: string; value: string; color: string; strong?: boolean }) {
  return (
    <View style={[styles.line, strong && [styles.strongLine, { borderColor: color }]]}>
      <ThemedText type="body" style={[{ color }, strong && styles.semibold]}>
        {label}
      </ThemedText>
      <ThemedText type="body" style={[styles.tabular, { color }, strong && styles.semibold]}>
        {value}
      </ThemedText>
    </View>
  );
}

function PeriodCard({
  number,
  period,
  amounts,
  removable,
  onChange,
  onRemove,
}: {
  number: number;
  period: PeriodDraft;
  amounts: { days: number; usageCents: number; supplyCents: number };
  removable: boolean;
  onChange: (key: keyof PeriodDraft, value: string) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const figure = (key: 'kwh' | 'usageRate' | 'supplyRate', label: string) => (
    <Field label={label} size="sm" style={styles.fill}>
      {(a11y) => (
        <Input
          {...a11y}
          accessibilityLabel={`Period ${number} ${label}`}
          fieldSize="md"
          keyboardType={UNSIGNED}
          value={period[key]}
          onChangeText={(value) => onChange(key, value)}
          style={styles.number}
        />
      )}
    </Field>
  );

  return (
    <Card
      level="tile"
      padding="md"
      entering={riseIn}
      exiting={fadeOut}
      layout={settle}
      accessibilityLabel={`Period ${number}`}
      style={styles.period}>
      <View style={styles.periodHead}>
        <ThemedText type="body" accessibilityRole="header" style={styles.semibold}>
          Period {number}
        </ThemedText>
        {removable && <IconButton icon={Icons.trash} label={`Remove period ${number}`} onPress={onRemove} style={styles.remove} />}
      </View>
      <View style={styles.pair}>
        <DateField label="From" size="sm" value={period.startDate} onChange={(value) => onChange('startDate', value)} />
        <DateField
          label="To"
          size="sm"
          value={period.endDate}
          onChange={(value) => onChange('endDate', value)}
          minimum={period.startDate || undefined}
        />
      </View>
      <View style={styles.figures}>
        {figure('kwh', 'kWh')}
        {figure('usageRate', 'Usage c/kWh')}
        {figure('supplyRate', 'Supply c/day')}
      </View>
      <View style={[styles.periodFoot, { borderColor: theme.hairlineStrong }]}>
        <ThemedText type="meta" themeColor="fgBody" style={[styles.flexText, styles.tabular]}>
          {amounts.days} {amounts.days === 1 ? 'day' : 'days'} · {money(amounts.usageCents)} usage +{' '}
          {money(amounts.supplyCents)} supply
        </ThemedText>
        <ThemedText type="meta" style={[styles.semibold, styles.tabular]}>
          {money(amounts.usageCents + amounts.supplyCents)}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flexText: { flex: 1, minWidth: 0 },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  tabular: { fontVariant: ['tabular-nums'] },
  content: { padding: Gutter, gap: 22, paddingBottom: 40 },
  card: { gap: 14 },
  pair: { flexDirection: 'row', gap: 10 },
  total: { height: 56, paddingLeft: 32, fontSize: 26, fontVariant: ['tabular-nums'] },
  dollar: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    fontSize: 26,
    lineHeight: 56,
    fontWeight: '300',
    pointerEvents: 'none',
  },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  list: { paddingHorizontal: 16 },
  discounts: { gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  narrow: { width: 88 },
  number: { paddingHorizontal: 10, fontVariant: ['tabular-nums'] },
  right: { textAlign: 'right' },
  adjustments: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  adjustment: { width: 96 },
  note: { paddingHorizontal: 4 },
  check: { gap: 8, paddingHorizontal: 16, paddingVertical: 18, borderRadius: Radius.tile },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  strongLine: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  period: { gap: 12 },
  periodHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  remove: { marginVertical: -10, marginRight: -10 },
  figures: { flexDirection: 'row', gap: 8 },
  periodFoot: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
});
