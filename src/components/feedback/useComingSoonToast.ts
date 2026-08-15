import { useCallback, useRef, useState } from 'react';

// Drives a transient "Coming soon" toast for feature-flagged-off buttons
// (build spec section 7.2). Shared across the welcome screen's three gated
// buttons rather than one instance per button, so only one toast is ever
// visible at a time.
export function useComingSoonToast(durationMs = 1800) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), durationMs);
  }, [durationMs]);

  return { visible, show };
}
