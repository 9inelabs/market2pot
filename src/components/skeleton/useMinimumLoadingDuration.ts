import { useEffect, useRef, useState } from 'react';

// Keeps a loading flag true for at least `minMs`, even if the real loading
// state resolves faster. Without this floor, fast responses cause a skeleton
// flash that reads as a glitch (build spec section 10.2).
export function useMinimumLoadingDuration(isLoading: boolean, minMs = 300): boolean {
  const [visible, setVisible] = useState(isLoading);
  const startedAt = useRef<number | null>(isLoading ? Date.now() : null);

  useEffect(() => {
    if (isLoading) {
      startedAt.current = Date.now();
      setVisible(true);
      return;
    }

    const elapsed = startedAt.current ? Date.now() - startedAt.current : minMs;
    const remaining = Math.max(0, minMs - elapsed);

    const timeout = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(timeout);
  }, [isLoading, minMs]);

  return visible;
}
