import { Stack } from 'expo-router';

import { crossfade } from '@/components/ui/motion';

export default function HouseLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}>
      {/* Sections of one tab: switching swaps in place, as the web's segments do. */}
      <Stack.Screen name="index" options={{ title: 'House', ...crossfade }} />
      <Stack.Screen name="dinner/index" options={{ title: 'House', ...crossfade }} />
      {/* Pushed, so Back returns to the week rather than leaving the tab. */}
      <Stack.Screen name="dinner/dishes" options={{ title: 'Dishes', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
