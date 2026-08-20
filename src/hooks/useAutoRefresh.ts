import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

// Refetches whenever the screen regains focus, plus on a plain interval
// while it stays focused and the app is in the foreground — used by Home,
// Orders, Messages (inbox), and Notifications so they feel live without
// requiring a manual pull-to-refresh. Chat threads don't need this (they
// already have a genuine Realtime subscription); this is the lighter-weight
// polling fallback for list screens that don't.
export function useAutoRefresh(refresh: () => void | Promise<void>, intervalMs = 20000) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      refreshRef.current();

      const interval = setInterval(() => {
        if (AppState.currentState === 'active') {
          refreshRef.current();
        }
      }, intervalMs);

      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intervalMs])
  );
}
