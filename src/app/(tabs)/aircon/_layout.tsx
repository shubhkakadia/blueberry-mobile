import { Stack } from 'expo-router';

import { crossfade } from '@/components/ui/motion';

export default function AirconLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}>
      {/* Sections of one tab: switching swaps in place, as the web's segments do. */}
      <Stack.Screen name="index" options={{ title: 'Aircon', ...crossfade }} />
      <Stack.Screen name="timers/index" options={{ title: 'Aircon', ...crossfade }} />
      <Stack.Screen name="timers/[id]" options={{ presentation: 'modal', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
