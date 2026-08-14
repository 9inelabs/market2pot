import { Children, isValidElement, type ReactNode } from 'react';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  initialDelay?: number;
  step?: number;
  distance?: number;
};

export function Stagger({ children, initialDelay = 0, step = 70, distance = 16 }: Props) {
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
                : FadeInDown.delay(initialDelay + i * step).duration(380).springify().damping(18)
            }
          >
            {child}
          </Animated.View>
        ))}
    </>
  );
}
