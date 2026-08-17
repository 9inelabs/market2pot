import { Children, isValidElement, type ReactNode } from 'react';
import Animated, { Easing, FadeInDown, useReducedMotion } from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  initialDelay?: number;
  step?: number;
};

// Staggered entrance: each direct child fades and slides up into place in
// sequence. Timing-based with a plain ease-out curve, not a spring — no
// overshoot/bounce, just a clean deceleration into place (the same shape
// most native platform transitions use).
export function Stagger({ children, initialDelay = 0, step = 70 }: Props) {
  const reduced = useReducedMotion();

  return (
    <>
      {Children.toArray(children)
        .filter(isValidElement)
        .map((child, i) => (
          <Animated.View
            key={i}
            entering={
              reduced
                ? undefined
                : FadeInDown.delay(initialDelay + i * step)
                    .duration(350)
                    .easing(Easing.out(Easing.cubic))
            }
          >
            {child}
          </Animated.View>
        ))}
    </>
  );
}
