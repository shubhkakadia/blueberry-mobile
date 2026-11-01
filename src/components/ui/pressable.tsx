import { useState } from 'react';
import { Pressable as NativePressable, type PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { easeChanges } from '@/components/ui/motion';

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);

// Android snaps a transform's first transition when it starts from no transform at all.
const atRest = { transform: [{ scale: 1 }] };

/** React Native's Pressable, except that its pressed and selected looks ease rather than snap. */
export function Pressable({ style, onPressIn, onPressOut, ...rest }: PressableProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      // Animated reads a flat style, so the function form has to be resolved here.
      style={[atRest, typeof style === 'function' ? style({ pressed, hovered: false }) : style, easeChanges]}
    />
  );
}
