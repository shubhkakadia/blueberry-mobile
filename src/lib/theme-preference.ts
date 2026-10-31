import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

const KEY = 'theme-preference';

/** The household member's choice on this phone; 'system' until they pick a side. */
export function loadThemePreference(): ThemePreference {
  try {
    const stored = SecureStore.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Not stored (or no secure store, e.g. the web preview): follow the system.
  }
  return 'system';
}

/** Re-themes the whole app, native controls included; `useColorScheme` follows. */
export function applyThemePreference(preference: ThemePreference): void {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

export function saveThemePreference(preference: ThemePreference): void {
  applyThemePreference(preference);
  try {
    SecureStore.setItem(KEY, preference);
  } catch {
    // The choice still holds for this session.
  }
}
