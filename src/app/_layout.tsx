import {
  Geologica_200ExtraLight,
  Geologica_300Light,
  Geologica_400Regular,
  Geologica_500Medium,
  Geologica_600SemiBold,
  Geologica_700Bold,
} from '@expo-google-fonts/geologica';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { FontFamily, navigationTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

/** Every weight the design uses, from the 200 of the setpoint numeral to the 700 of a badge. */
const FONTS = [
  {
    fontFamily: FontFamily,
    fontDefinitions: [
      { path: Geologica_200ExtraLight, weight: 200 },
      { path: Geologica_300Light, weight: 300 },
      { path: Geologica_400Regular, weight: 400 },
      { path: Geologica_500Medium, weight: 500 },
      { path: Geologica_600SemiBold, weight: 600 },
      { path: Geologica_700Bold, weight: 700 },
    ],
  },
];

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [loaded, error] = useFonts(FONTS);
  const { user } = useAuth();
  // A font that fails to load falls back to the system face rather than holding the splash forever.
  // The splash also covers the session check, so the app opens on the right screen without a flash.
  const ready = (loaded || error !== null) && user !== undefined;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={navigationTheme(scheme)}>
      {/* Signing in or out swaps the whole app at once, as the web does. */}
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
