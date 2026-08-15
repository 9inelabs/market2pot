import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  // True until the first onAuthStateChange fires — lets the routing gate
  // (phase 5) hold the splash/loading state instead of briefly treating a
  // not-yet-checked session as "signed out".
  initializing: boolean;
  loadingProfile: boolean;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,
  loadingProfile: false,

  fetchProfile: async () => {
    const userId = get().session?.user.id;
    if (!userId) {
      set({ profile: null });
      return;
    }

    set({ loadingProfile: true });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    set({ profile: error ? null : data, loadingProfile: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

// Keeps the store's session in sync with Supabase's own auth state, and
// (re)fetches the profile whenever the signed-in user changes. The routing
// gate (phase 5) reads this store rather than subscribing to Supabase itself.
supabase.auth.onAuthStateChange((_event, session) => {
  const previousUserId = useAuthStore.getState().session?.user.id;
  useAuthStore.setState({ session, initializing: false });

  if (session?.user.id !== previousUserId) {
    if (session) {
      useAuthStore.getState().fetchProfile();
    } else {
      useAuthStore.setState({ profile: null });
    }
  }
});
