/**
 * Formatting for energy figures, without `Intl` so it reads the same on every
 * phone's JavaScript engine. No imports, so it can be checked under plain Node.
 */

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** `$1,234.56`, `-$27.43`, or whole dollars with `decimals = 0`: `$166`. */
export function money(cents: number, decimals = 2): string {
  const [whole, fraction] = (Math.abs(cents) / 100).toFixed(decimals).split('.');
  return `${cents < 0 ? '-' : ''}$${group(whole!)}${fraction ? `.${fraction}` : ''}`;
}

/** A count rounded and grouped: `1,412`. */
export const wholeNumber = (value: number) => group(Math.round(value).toFixed(0));

/** A rate in cents with two to three decimals, as a bill prints it: `39.60`, `30.123`. */
export function centsFigure(value: number): string {
  const fixed = value.toFixed(3);
  return fixed.endsWith('0') ? fixed.slice(0, -1) : fixed;
}

/**
 * Rates are stored as GST-inclusive dollars; a bill prints them in cents.
 * Rounded so float noise never counts as a change.
 */
export function rateCents(dollars: number): number {
  return Math.round(dollars * 100_000) / 1000;
}

// Fixed three-letter names: en-AU abbreviates September as "Sept", which
// breaks the column of ranges.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const monthOf = (date: string) => MONTHS[Number(date.slice(5, 7)) - 1]!;

/** A `YYYY-MM` month as `Oct`, `October` or `O`. */
export function monthName(month: string, style: 'long' | 'short' | 'narrow' = 'short'): string {
  const index = Number(month.slice(5, 7)) - 1;
  if (style === 'long') return LONG_MONTHS[index]!;
  return style === 'narrow' ? MONTHS[index]![0]! : MONTHS[index]!;
}

/** `1 Sep`, or `1 Sep 2026` with the year. */
export function billDate(date: string, year = false): string {
  return `${Number(date.slice(8, 10))} ${monthOf(date)}${year ? ` ${date.slice(0, 4)}` : ''}`;
}

/** `Jul – Sep 2026`, `Dec 2025 – Feb 2026`, or `Jul 2026` for a one-month bill. */
export function billRange(start: string, end: string): string {
  const [startYear, endYear] = [start.slice(0, 4), end.slice(0, 4)];
  if (start.slice(0, 7) === end.slice(0, 7)) return `${monthOf(end)} ${endYear}`;
  return startYear === endYear
    ? `${monthOf(start)} – ${monthOf(end)} ${endYear}`
    : `${monthOf(start)} ${startYear} – ${monthOf(end)} ${endYear}`;
}

/** Inclusive day count between two `YYYY-MM-DD` dates. */
export function daysInclusive(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

/** `3–6 pm`, or `9 am–12 pm` when the window crosses noon or midnight. */
export function windowLabel(hour: number): string {
  const part = (h: number) => ({ h: h % 12 || 12, suffix: h % 24 < 12 ? 'am' : 'pm' });
  const from = part(hour);
  const to = part(hour + 3);
  return from.suffix === to.suffix ? `${from.h}–${to.h} ${to.suffix}` : `${from.h} ${from.suffix}–${to.h} ${to.suffix}`;
}

/** `12a`, `3p`: the hour axis under the runtime bars. */
export const hourTick = (hour: number) => `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`;

// --- Bill form ------------------------------------------------------------------

/** Lenient about what a bill prints - `1,412`, `$625.25`, `−27.43` - and 0 for anything else. */
export function num(value: string): number {
  const cleaned = value.trim().replace(/[\s,$]/g, '').replace(/^−/, '-');
  const parsed = Number(cleaned);
  return cleaned && Number.isFinite(parsed) ? parsed : 0;
}

export const toCents = (dollars: string) => Math.round(num(dollars) * 100);
/** A rate typed in cents, stored in dollars. */
export const toDollars = (cents: string) => Number((num(cents) / 100).toFixed(8));
/** Cents as a plain `12.34` for an input. */
export const dollars = (cents: number) => (cents / 100).toFixed(2);
/** `0.396` $/kWh reads as `39.6`; toFixed first drops the float noise. */
export const centsText = (rate: number) => String(Number((rate * 100).toFixed(6)));

/** The day after `YYYY-MM-DD`, or `` for a blank or invalid date. */
export function nextDay(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  if (!date || Number.isNaN(value.getTime())) return '';
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

/** A rate period as typed: dates, kWh, and rates in cents. */
export type PeriodDraft = { startDate: string; endDate: string; kwh: string; usageRate: string; supplyRate: string };

/** Charges are always kWh × rate and days × supply, both endpoints counted. */
export function periodAmounts(period: PeriodDraft) {
  const start = Date.parse(`${period.startDate}T00:00:00Z`);
  const end = Date.parse(`${period.endDate}T00:00:00Z`);
  const days = Number.isNaN(start) || Number.isNaN(end) || end < start ? 0 : Math.round((end - start) / 86_400_000) + 1;
  return {
    days,
    usageCents: Math.round(num(period.kwh) * num(period.usageRate)),
    supplyCents: Math.round(days * num(period.supplyRate)),
  };
}

export const emptyPeriod = (startDate = ''): PeriodDraft => ({ startDate, endDate: '', kwh: '', usageRate: '', supplyRate: '' });

/** The parts of a saved bill the form starts from; `EnergyBill` fits it. */
type SavedBill = {
  adjustmentsCents: number;
  periods: (Omit<PeriodDraft, 'kwh' | 'usageRate' | 'supplyRate'> & {
    kwh: number;
    usageRate: number;
    supplyRate: number;
    usageCents: number;
    supplyCents: number;
  })[];
};

/**
 * Charges are now always kWh × rate and days × supply. A bill saved by the old
 * form may carry per-period charges that differ by a few cents of retailer
 * rounding; that difference moves into adjustments so the bill still adds up
 * to the same invoice total.
 */
export function draftFrom(bill: SavedBill | null) {
  if (!bill) return { periods: [emptyPeriod()], adjustments: '0', carried: 0 };
  let carried = 0;
  const periods = bill.periods.map((p) => {
    const draft = {
      startDate: p.startDate,
      endDate: p.endDate,
      kwh: String(p.kwh),
      usageRate: centsText(p.usageRate),
      supplyRate: centsText(p.supplyRate),
    };
    const computed = periodAmounts(draft);
    carried += p.usageCents - computed.usageCents + p.supplyCents - computed.supplyCents;
    return draft;
  });
  return { periods, adjustments: dollars(bill.adjustmentsCents + carried), carried };
}

/** The check-total panel: what the typed bill adds up to, against the invoice. A blank discount uses the computed one. */
export function reconcile(form: {
  periods: PeriodDraft[];
  discountPercent: string;
  discountScope: 'usage' | 'usage_supply';
  discount: string;
  adjustments: string;
  amountDue: string;
}) {
  const amounts = form.periods.map(periodAmounts);
  const gross = amounts.reduce((sum, a) => sum + a.usageCents + a.supplyCents, 0);
  const eligible = amounts.reduce(
    (sum, a) => sum + a.usageCents + (form.discountScope === 'usage_supply' ? a.supplyCents : 0),
    0,
  );
  const computedDiscount = Math.round((eligible * num(form.discountPercent)) / 100);
  const discountCents = form.discount.trim() ? toCents(form.discount) : computedDiscount;
  const adjustmentsCents = toCents(form.adjustments);
  const calculated = gross - discountCents + adjustmentsCents;
  const invoiceCents = toCents(form.amountDue);
  const hasInvoice = form.amountDue.trim() !== '';
  return {
    amounts,
    gross,
    computedDiscount,
    discountCents,
    adjustmentsCents,
    calculated,
    invoiceCents,
    hasInvoice,
    balanced: hasInvoice && calculated === invoiceCents,
    difference: invoiceCents - calculated,
  };
}

/** Round dollar gridlines: $100 steps for a typical house, finer for a flat. */
export function axis(maxCents: number): { ticks: number[]; top: number } {
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].map((dollars) => dollars * 100);
  const step = steps.find((candidate) => maxCents / candidate <= 4) ?? steps.at(-1)!;
  const count = Math.max(1, Math.ceil(maxCents / step));
  // Headroom above the last gridline, so its label never sits on the card edge.
  return { ticks: Array.from({ length: count + 1 }, (_, index) => index * step), top: count * step * 1.1 };
}
