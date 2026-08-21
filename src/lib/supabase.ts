import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// These are inlined by Metro at BUILD time, not read at runtime — so an EAS
// build picks them up from the EAS environment, never from .env, which is
// gitignored and therefore absent from the uploaded build archive.
//
// This check exists because a build without them used to crash on launch with
// no usable message: createClient(undefined, undefined) throws deep inside
// supabase-js during the first import, before any UI mounts, and Android just
// reports "app has stopped unexpectedly". The `!` assertions that used to be
// here were compile-time only and did nothing at runtime.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ]
    .filter(Boolean)
    .join(', ');
  throw new Error(
    `Supabase is not configured: ${missing} missing from this build. ` +
      'For a local run, set it in .env. For an EAS build, set it with ' +
      '`eas env:set` — .env is gitignored and never reaches the build.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // must be false in React Native
  },
});

// Without this, tokens silently stop refreshing when the app is backgrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
