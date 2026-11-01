import { Platform } from 'react-native';
import {
  Easing,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';

/** `--ease-out-soft` from the web. */
const easeOutSoft = Easing.bezier(0.32, 0.72, 0, 1);

// shortcut: Reanimated on web leaves entered views `position: absolute`, so stacked notes overlap;
// web is only a dev preview here, so it skips these. Drop the guard if web becomes a target.
const native = Platform.OS !== 'web';

// Entering and layout animations honour reduced motion themselves; the style-driven ones below must ask.
// eslint-disable-next-line react-hooks/rules-of-hooks -- Not a real hook: a flag read once at launch.
const still = useReducedMotion();

const rise = () =>
  FadeInUp.duration(220).easing(easeOutSoft).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });

/** A note or toast arriving: fades in and settles up 8px. */
export const riseIn = native ? rise() : undefined;

/** A list arriving all at once: each item rises just after the one above. A builder's `delay` mutates it, so each gets its own. */
export const riseInAt = (index: number) => (native ? rise().delay(Math.min(index, 6) * 40) : undefined);

/** The refused-change toast dropping out of sight once acknowledged. */
export const sinkOut = native ? FadeOutDown.duration(200).easing(Easing.in(Easing.ease)) : undefined;

/** Something taken out of a list or a screen. */
export const fadeOut = native ? FadeOut.duration(140) : undefined;

/** Neighbours sliding to where a change in the list left them. */
export const settle = native ? LinearTransition.duration(220).easing(easeOutSoft) : undefined;

/** A stack screen that swaps in place: a quick crossfade, not a push. */
export const crossfade = { animation: 'fade', animationDuration: 180 } as const;

/** On an `Animated` view: a press, a selected fill or a dimmed state eases rather than snaps. */
export const easeChanges = {
  transitionProperty: still
    ? ['opacity', 'backgroundColor', 'borderColor']
    : ['transform', 'opacity', 'backgroundColor', 'borderColor'],
  transitionDuration: 160,
  transitionTimingFunction: 'ease-out',
};

/** A reading that just changed settles into place. Key the view by the value, so each change replays it. */
export const tick = still
  ? undefined
  : {
      animationName: { from: { opacity: 0.35, transform: [{ scale: 0.92 }] } },
      animationDuration: 180,
      animationTimingFunction: 'ease-out',
    };

const grow = { animationDuration: 480, animationTimingFunction: 'ease-out', animationFillMode: 'backwards' };

/** A chart bar rising from its baseline. Add an `animationDelay` to stagger a row of them. */
export const growUp = still
  ? undefined
  : { ...grow, transformOrigin: 'bottom', animationName: { from: { transform: [{ scaleY: 0 }] } } };

/** A horizontal bar growing from the left, then easing to new figures. Takes an `animationDelay` too. */
export const growAcross = still
  ? undefined
  : {
      ...grow,
      transformOrigin: 'left',
      animationName: { from: { transform: [{ scaleX: 0 }] } },
      transitionProperty: 'width',
      transitionDuration: 300,
      transitionTimingFunction: 'ease-out',
    };
