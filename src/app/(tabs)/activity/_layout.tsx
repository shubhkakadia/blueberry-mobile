import { Stack } from 'expo-router';

export default function ActivityLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Activity' }} />
    </Stack>
  );
}
