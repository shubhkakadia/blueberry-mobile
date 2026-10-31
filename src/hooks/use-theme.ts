/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { createContext, use } from 'react';

import { Colors, type ThemeColor } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Palette = { [K in ThemeColor]: string };

/**
 * Re-themes everything inside it - the web's `climateVars`. That is how changing
 * mode re-colours Aircon · Now without a single component knowing which mode it is in.
 */
export const ThemeOverride = createContext<Partial<Palette> | null>(null);

export function useTheme(): Palette {
  const scheme = useColorScheme();
  const override = use(ThemeOverride);
  const base = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return override ? { ...base, ...override } : base;
}
