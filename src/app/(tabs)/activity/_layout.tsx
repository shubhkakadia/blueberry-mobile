import { Stack } from 'expo-router';

import { crossfade } from '@/components/ui/motion';
import { RuntimeProvider } from '@/hooks/use-runtime';

export default function ActivityLayout() {
  return (
    // Rooms and Timeline read one period; the filter edits it.
    <RuntimeProvider>
      <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}>
        {/* Sections of one tab: switching swaps in place, as the web's segments do. */}
        <Stack.Screen name="index" options={{ title: 'Activity', ...crossfade }} />
        <Stack.Screen name="timeline" options={{ title: 'Activity', ...crossfade }} />
        <Stack.Screen name="costs" options={{ title: 'Activity', ...crossfade }} />
        <Stack.Screen
          name="filter"
          options={{ title: 'Filter runtime', presentation: 'modal', headerLargeTitleEnabled: false }}
        />
      </Stack>
    </RuntimeProvider>
  );
}
