import { useCallback, useEffect, useRef, useState } from 'react';

// Simple countdown for OTP send/resend cooldowns (build spec section 7.3:
// "60s client cooldown"). This is a UX safeguard against accidental
// double-taps, not the "enforced server-side" rate limit the spec also
// calls for — see phase 4 report for that gap.
export function useCooldown(durationSeconds: number) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setRemainingSeconds(durationSeconds);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [durationSeconds]);

  useEffect(
    () => () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    },
    []
  );

  return { remainingSeconds, start, isActive: remainingSeconds > 0 };
}
