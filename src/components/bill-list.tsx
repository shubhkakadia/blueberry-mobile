import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { rangeOf, type EnergyBill } from '@/lib/energy';
import { money } from '@/lib/energy-format';

/** Opens the bill form over the whole app: `new`, or a saved bill to edit or delete. */
export const openBill = (id: number | 'new') => router.push(`/bill/${id}`);

/** Saved invoices, newest first; tap one to edit or delete it. */
export function BillList({ bills, subtitle }: { bills: EnergyBill[]; subtitle: (bill: EnergyBill) => string }) {
  const theme = useTheme();
  return (
    <Card padding="list">
      {bills.map((bill, index) => (
        <Pressable
          key={bill.id}
          accessibilityRole="button"
          accessibilityHint="Edit or delete this bill"
          onPress={() => openBill(bill.id)}
          style={({ pressed }) => [
            styles.row,
            index > 0 && { borderTopWidth: 1, borderColor: theme.hairline },
            pressed && styles.pressed,
          ]}>
          <View style={styles.text}>
            <ThemedText type="body" numberOfLines={1} style={styles.semibold}>
              {rangeOf(bill)}
            </ThemedText>
            <ThemedText type="meta" themeColor="fgMuted" numberOfLines={1} style={styles.tabular}>
              {subtitle(bill)}
            </ThemedText>
          </View>
          <ThemedText style={[styles.semibold, styles.tabular]}>{money(bill.amountDueCents)}</ThemedText>
          <SymbolView name={Icons.chevronRight} size={16} tintColor={theme.fgMuted} />
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
  pressed: { opacity: 0.7 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  semibold: { fontWeight: '600' },
  tabular: { fontVariant: ['tabular-nums'] },
});
