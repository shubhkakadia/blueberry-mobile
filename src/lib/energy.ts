import { request } from '@/lib/api';
import { billRange, daysInclusive } from '@/lib/energy-format';

/** Invoice amounts are integer cents; rates are GST-inclusive dollars. */
export interface EnergyPeriod {
  startDate: string;
  endDate: string;
  kwh: number;
  usageRate: number;
  supplyRate: number;
  usageCents: number;
  supplyCents: number;
}

export interface EnergyBillInput {
  retailer: string;
  planName: string;
  issuedDate: string;
  dueDate: string;
  nextReadStart: string | null;
  nextReadEnd: string | null;
  discountPercent: number;
  discountScope: 'usage' | 'usage_supply';
  discountCents: number;
  adjustmentsCents: number;
  amountDueCents: number;
  periods: EnergyPeriod[];
}

export interface EnergyBill extends EnergyBillInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface CostMonth {
  month: string;
  billedDays: number;
  estimatedDays: number;
  missingDays: number;
  billedCents: number;
  estimatedCents: number;
  totalCents: number;
}

export interface CostSummary {
  billId: number;
  startDate: string;
  endDate: string;
  days: number;
  kwh: number;
  dailyKwh: number;
  dailyCents: number;
  projectedDailyCents: number;
  usageCents: number;
  supplyCents: number;
  currentChargesCents: number;
  months: CostMonth[];
  averageMonthCents: number | null;
  averageMonthCount: number;
  currentMonth: string;
  elapsedDays: number;
  monthDays: number;
  monthToDateCents: number;
  forecastCents: number;
  billedToDateCents: number;
  points: { day: number; cents: number; estimated: boolean }[];
  /** January to December of the current year; absent from older bridges, which send only `months`. */
  year?: CostMonth[];
}

export interface RuntimeProfile {
  from: string;
  to: string;
  totalSeconds: number;
  buckets: { hour: number; seconds: number; percentage: number }[];
}

export interface EnergyCostsResponse {
  timeZone: string;
  /** Today in the home's zone, `YYYY-MM-DD`. */
  asOf: string;
  bills: EnergyBill[];
  summary: CostSummary | null;
  runtime: RuntimeProfile;
}

export const energyApi = {
  costs: () => request<EnergyCostsResponse>('/api/energy/costs'),
  save: (bill: EnergyBillInput, id?: number) =>
    request<EnergyBill>(id === undefined ? '/api/energy/bills' : `/api/energy/bills/${id}`, {
      method: id === undefined ? 'POST' : 'PUT',
      body: JSON.stringify(bill),
    }),
  remove: (id: number) => request<void>(`/api/energy/bills/${id}`, { method: 'DELETE' }),
};

/** Most recent coverage first, independent of when a bill was entered. */
export function newestFirst(bills: EnergyBill[]): EnergyBill[] {
  return [...bills].sort(
    (a, b) => b.periods.at(-1)!.endDate.localeCompare(a.periods.at(-1)!.endDate) || b.id - a.id,
  );
}

export const rangeOf = (bill: EnergyBill) => billRange(bill.periods[0]!.startDate, bill.periods.at(-1)!.endDate);

/** Inclusive day count across every rate period on the bill. */
export const billDays = (bill: EnergyBill) =>
  bill.periods.reduce((sum, p) => sum + daysInclusive(p.startDate, p.endDate), 0);

export const billKwh = (bill: EnergyBill) => bill.periods.reduce((sum, p) => sum + p.kwh, 0);

/** `2 rate periods · 12% discount · credit` - what is on the bill, not totals. */
export function billSummary(bill: EnergyBill): string {
  const count = bill.periods.length;
  const parts = [`${count} rate ${count === 1 ? 'period' : 'periods'}`];
  if (bill.discountCents > 0) parts.push(bill.discountPercent > 0 ? `${bill.discountPercent}% discount` : 'discount');
  if (bill.adjustmentsCents > 0) parts.push('fees');
  if (bill.adjustmentsCents < 0) parts.push('credit');
  return parts.join(' · ');
}

/** Illustrative variation on the estimated part of a month, not a confidence interval. */
export const BAND = 0.08;

/** Splits a month into its billed part and the ±8% range on its estimate. */
export function band(month: CostMonth) {
  return {
    low: month.billedCents + month.estimatedCents * (1 - BAND),
    high: month.billedCents + month.estimatedCents * (1 + BAND),
  };
}
