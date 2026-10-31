/**
 * Design tokens ported from the Home Management System web UI
 * (`web/src/index.css` and `web/src/climateTheme.ts`). Names follow the web's
 * `--c-*` variables in camelCase, so a screen can be ported by looking up the
 * same token. Module-specific tokens (timeline tags, chart colours) arrive with
 * the module that uses them.
 */

import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

export const Colors = {
  /** The design's own values: ink on a warm paper canvas, white cards lifted by a 1px shadow. */
  light: {
    canvas: '#f3f4f1',

    fgStrong: '#14202a',
    fg: '#14202a',
    fgBody: '#34475a',
    fgMuted: '#4a5763',
    /** The lightest text grey; 4.9:1 on the canvas, still legal for 12px meta lines. */
    fgSubtle: '#5f6b75',
    /** Disabled controls only; never text that carries information. */
    fgDisabled: '#8a949c',

    surface: '#ffffff',
    surfaceInset: '#eef1f3',
    surfaceField: '#fafbfa',
    surfaceDim: '#f9faf8',
    hairline: '#eceeeb',
    hairlineStrong: '#d5dade',
    border: '#c9cfd4',
    segment: '#ffffff',
    segmentTrack: 'rgba(20, 32, 42, 0.07)',
    skeleton: 'rgba(20, 32, 42, 0.08)',

    /** Translucent white over a mode-tinted page, so the tint shows through on Aircon · Now. */
    glass: 'rgba(255, 255, 255, 0.62)',
    glassStrong: 'rgba(255, 255, 255, 0.72)',
    scrim: 'rgba(20, 32, 42, 0.4)',

    accent: '#1c64a6',
    accentFg: '#ffffff',
    accentDeep: '#0e3b63',
    accentSoft: '#e1ecf6',
    accentMuted: '#9dbedd',

    /** A selected filter pill is ink, not accent: choosing is navigation, accent is for acting. */
    select: '#14202a',
    selectFg: '#ffffff',
    switchOff: '#bfc6cc',

    positive: '#17683a',
    positiveDot: '#1f8a4c',
    positiveSoft: '#ddefe3',
    positiveInk: '#124d2b',
    warning: '#6f5b12',
    warningSoft: '#efe8d3',
    warningInk: '#3e3208',
    danger: '#a0461a',
    dangerSoft: '#f8e3d6',
    dangerInk: '#5e260b',
    dangerBorder: '#e4c3b1',

    toast: '#14202a',
    toastFg: '#ffffff',
    toastIcon: '#f2b48c',

    shadowE1: '0 1px 2px rgba(20, 32, 42, 0.06)',
    shadowE2: '0 1px 2px rgba(14, 59, 99, 0.08), 0 12px 32px rgba(14, 59, 99, 0.08)',
    shadowSegment: '0 1px 2px rgba(20, 32, 42, 0.12)',
    shadowToast: '0 10px 30px rgba(20, 32, 42, 0.3)',
  },
  /** Same structure on a blue-black canvas; every accent lifted until it clears 4.5:1 on its card. */
  dark: {
    canvas: '#0f1417',

    fgStrong: '#eef2f5',
    fg: '#e6ecf0',
    fgBody: '#c2ccd4',
    fgMuted: '#a2aeb8',
    fgSubtle: '#8e9aa5',
    fgDisabled: '#5d6973',

    surface: '#182127',
    surfaceInset: '#243039',
    surfaceField: '#121a1f',
    surfaceDim: '#141c21',
    hairline: '#253039',
    hairlineStrong: '#33414b',
    border: '#3b4954',
    segment: '#2b3740',
    segmentTrack: 'rgba(255, 255, 255, 0.07)',
    skeleton: 'rgba(230, 236, 240, 0.08)',

    glass: 'rgba(255, 255, 255, 0.07)',
    glassStrong: 'rgba(255, 255, 255, 0.1)',
    scrim: 'rgba(0, 0, 0, 0.6)',

    accent: '#62aeef',
    accentFg: '#071521',
    accentDeep: '#b3d7f7',
    accentSoft: '#15293b',
    accentMuted: '#2d5577',

    select: '#e6ecf0',
    selectFg: '#0f1417',
    switchOff: '#4a5761',

    positive: '#6bd199',
    positiveDot: '#3fbf78',
    positiveSoft: '#12301f',
    positiveInk: '#b2ebc9',
    warning: '#ddbf5e',
    warningSoft: '#2b2511',
    warningInk: '#eedc9e',
    danger: '#f09a70',
    dangerSoft: '#33190f',
    dangerInk: '#f8c9b0',
    dangerBorder: '#5a2f1c',

    toast: '#2a363f',
    toastFg: '#f2f5f7',
    toastIcon: '#f2b48c',

    // A shadow does nothing on a near-black canvas, so the lift is a faint ring instead.
    shadowE1: '0 0 0 1px rgba(255, 255, 255, 0.045)',
    shadowE2: '0 0 0 1px rgba(255, 255, 255, 0.06), 0 12px 32px rgba(0, 0, 0, 0.4)',
    shadowSegment: '0 1px 2px rgba(0, 0, 0, 0.4)',
    shadowToast: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** One variable-weight family in the web; here six static faces registered under one name in `_layout`. */
export const FontFamily = 'Geologica';

/** The web's named text styles, in px. */
export const Type = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 22 },
  /** Row titles and readouts sit a step under body copy. */
  body: { fontSize: 15, lineHeight: 20 },
  /** Secondary lines: who added it, when it runs, what it costs. */
  meta: { fontSize: 13, lineHeight: 19 },
  /** Group label: ACCOUNT, BOUGHT · 2. Render uppercase. */
  eyebrow: { fontSize: 13, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6 },
  /** Screen title. */
  title: { fontSize: 30, lineHeight: 35, fontWeight: '600', letterSpacing: -0.8 },
  /** Sheet and form titles. */
  display: { fontSize: 20, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  /** A large light number that is the point of a block: total airflow. */
  metric: { fontSize: 40, lineHeight: 42, fontWeight: '300', letterSpacing: -1.2 },
  /** The one number the home screen is about. The web clamps it to 34vw; fixed here. */
  hero: { fontSize: 120, lineHeight: 120, fontWeight: '200', letterSpacing: -5.4 },
} as const;

/** Corners grow with the surface: a segment, a field, a row, a card. */
export const Radius = {
  control: 9999,
  segment: 11,
  button: 12,
  field: 12,
  input: 14,
  track: 14,
  row: 16,
  card: 18,
  panel: 20,
  tile: 22,
  hero: 22,
  sheet: 24,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** The page gutter. */
export const Gutter = Spacing.three;

/** Navigation chrome (headers, stack backgrounds) drawn from the same tokens. */
export function navigationTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.accent,
      background: c.canvas,
      card: c.canvas,
      text: c.fgStrong,
      border: c.hairline,
      notification: c.danger,
    },
    fonts: {
      regular: { fontFamily: FontFamily, fontWeight: '400' },
      medium: { fontFamily: FontFamily, fontWeight: '500' },
      bold: { fontFamily: FontFamily, fontWeight: '600' },
      heavy: { fontFamily: FontFamily, fontWeight: '700' },
    },
  };
}

// --- Climate ----------------------------------------------------------------

/** The colours of one climate mode, for a single colour scheme. */
export interface ClimateTint {
  /** The whole page behind Aircon · Now takes this colour. */
  page: string;
  /** Fill for selected and active controls. */
  accent: string;
  /** Readable foreground on top of `accent`. */
  accentFg: string;
  /** Labels and numerals that sit directly on `page`. */
  deep: string;
}

export interface ClimateTheme {
  /** Canonical lowercase key used for styling. */
  key: string;
  /** The mode as a button says it: Cool, Heat. */
  label: string;
  /** The unit as a status says it: Cooling, Heating. */
  status: string;
  light: ClimateTint;
  dark: ClimateTint;
}

/*
 * Light values are the design's own. Dark ones keep each mode's hue but swap
 * the roles: a deep, low-chroma page, and an accent lifted until it clears
 * 4.5:1 against it.
 */
const CLIMATES: Record<string, ClimateTheme> = {
  cool: {
    key: 'cool',
    label: 'Cool',
    status: 'Cooling',
    light: { page: '#dcebf5', accent: '#1c64a6', accentFg: '#ffffff', deep: '#0e3b63' },
    dark: { page: '#0f1e2a', accent: '#62aeef', accentFg: '#071521', deep: '#b3d7f7' },
  },
  heat: {
    key: 'heat',
    label: 'Heat',
    status: 'Heating',
    light: { page: '#f8e3d6', accent: '#a0461a', accentFg: '#ffffff', deep: '#5e260b' },
    dark: { page: '#2a170e', accent: '#f09a70', accentFg: '#2a1206', deep: '#f8c9b0' },
  },
  dry: {
    key: 'dry',
    label: 'Dry',
    status: 'Drying',
    light: { page: '#efe8d3', accent: '#6f5b12', accentFg: '#ffffff', deep: '#3e3208' },
    dark: { page: '#221e10', accent: '#d8bd5c', accentFg: '#211b05', deep: '#eedc9e' },
  },
  fan: {
    key: 'fan',
    label: 'Fan',
    status: 'Fan only',
    light: { page: '#e3e9e7', accent: '#35524c', accentFg: '#ffffff', deep: '#1d2e2a' },
    dark: { page: '#141d1b', accent: '#86b9ad', accentFg: '#0b1715', deep: '#c2ddd6' },
  },
  auto: {
    key: 'auto',
    label: 'Auto',
    status: 'Auto',
    light: { page: '#e4e3f4', accent: '#4a4699', accentFg: '#ffffff', deep: '#26235a' },
    dark: { page: '#1a1a30', accent: '#a6a1f2', accentFg: '#13123a', deep: '#d2cff8' },
  },
};

const CLIMATE_OFF: ClimateTheme = {
  key: 'off',
  label: 'Off',
  status: 'Off',
  light: { page: '#e7e9e8', accent: '#4a5763', accentFg: '#ffffff', deep: '#3a444c' },
  dark: { page: '#151a1d', accent: '#a2aeb8', accentFg: '#0f1417', deep: '#c2ccd4' },
};

/**
 * Mode names come from hardware at runtime (`ability.supportedModes`), not a
 * fixed enum, so unrecognized strings must still render sensibly.
 */
export function getClimateTheme(mode: string | undefined | null): ClimateTheme {
  if (!mode) return CLIMATE_OFF;
  const known = CLIMATES[mode.trim().toLowerCase()];
  if (known) return known;
  // An unknown mode still gets a label of its own, in neutral.
  return { ...CLIMATE_OFF, key: mode.toLowerCase(), label: mode, status: mode };
}

/** The tint for the scheme currently being rendered. */
export function climateTint(theme: ClimateTheme, scheme: 'light' | 'dark'): ClimateTint {
  return scheme === 'dark' ? theme.dark : theme.light;
}
