import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BillForm } from '@/components/bill-form';
import { Alert } from '@/components/ui/alert';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Gutter, Radius } from '@/constants/theme';
import { energyApi, type EnergyBill } from '@/lib/energy';

/**
 * `/bill/new` or `/bill/<id>`, opened from Activity · Costs and Settings · Energy
 * plan. Waits for the bridge's "today" (the home's zone, which caps the issue
 * date) and, for an edit, the bill itself.
 */
export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loaded, setLoaded] = useState<{ bill: EnergyBill | null; today: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    energyApi
      .costs()
      .then(({ bills, asOf }) => {
        const bill = id === 'new' ? null : bills.find((item) => String(item.id) === id);
        if (bill === undefined) setError('This bill no longer exists.');
        else setLoaded({ bill, today: asOf });
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (loaded) return <BillForm bill={loaded.bill} today={loaded.today} />;

  return (
    <View style={styles.content}>
      <Stack.Screen options={{ title: id === 'new' ? 'Add bill' : 'Edit bill' }} />
      {error ? (
        <Alert tone="danger">{error}</Alert>
      ) : (
        <View accessibilityLabel="Loading bill" style={styles.loading}>
          <SkeletonBlock style={{ height: 220, borderRadius: Radius.tile }} />
          <SkeletonBlock style={{ height: 260, borderRadius: Radius.tile }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Gutter },
  loading: { gap: 20 },
});
