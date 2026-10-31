import type { Href } from 'expo-router';

/** Each tab's sections, as the web's `nav.ts`. Names match the web's so `#/aircon/timers` reads as `/aircon/timers`. */
export const AIRCON_SECTIONS: { label: string; href: Href }[] = [
  { label: 'Now', href: '/aircon' },
  { label: 'Timers', href: '/aircon/timers' },
];
