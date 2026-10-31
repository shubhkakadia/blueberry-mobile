import { Platform } from 'react-native';
import { Easing, FadeInUp, FadeOutDown } from 'react-native-reanimated';

/** `--ease-out-soft` from the web. */
const easeOutSoft = Easing.bezier(0.32, 0.72, 0, 1);

// shortcut: Reanimated on web leaves entered views `position: absolute`, so stacked notes overlap;
// web is only a dev preview here, so it skips these. Drop the guard if web becomes a target.
const native = Platform.OS !== 'web';

/** A note or toast arriving: fades in and settles up 8px. */
export const riseIn = native
  ? FadeInUp.duration(220).easing(easeOutSoft).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
  : undefined;

/** The refused-change toast dropping out of sight once acknowledged. */
export const sinkOut = native ? FadeOutDown.duration(200).easing(Easing.in(Easing.ease)) : undefined;
